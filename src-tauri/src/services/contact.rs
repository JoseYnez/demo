use std::sync::Mutex;

use crate::clock::unix_millis;
use crate::error::{AppError, AppResult};
use crate::models::{Contact, ContactDraft, ContactInput};

#[derive(Default)]
struct Store {
    contacts: Vec<Contact>,
    next_id: u32,
}

#[derive(Default)]
pub struct ContactService {
    store: Mutex<Store>,
}

impl ContactService {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn seeded() -> AppResult<Self> {
        Self::new()
            .with_contact(
                "Ada Lovelace",
                "ada@example.com",
                "admin",
                "Cuenta de prueba.",
            )?
            .with_contact("Grace Hopper", "grace@example.com", "editor", "")?
            .with_contact("Alan Turing", "alan@example.com", "viewer", "")
    }

    pub fn with_contact(self, name: &str, email: &str, role: &str, notes: &str) -> AppResult<Self> {
        let draft = ContactDraft {
            name: name.to_string(),
            email: email.to_string(),
            role: role.to_string(),
            notes: notes.to_string(),
        };
        self.create(ContactInput::try_from(draft)?)?;
        Ok(self)
    }

    pub fn list(&self) -> AppResult<Vec<Contact>> {
        let store = self.lock()?;
        let mut contacts = store.contacts.clone();
        contacts.sort_by_key(|c| c.name.to_lowercase());
        Ok(contacts)
    }

    pub fn create(&self, input: ContactInput) -> AppResult<Contact> {
        let mut store = self.lock()?;
        Self::ensure_email_is_free(&store, input.email.as_str(), None)?;

        store.next_id += 1;
        let contact = Contact {
            id: store.next_id,
            name: input.name.as_str().to_string(),
            email: input.email.as_str().to_string(),
            role: input.role,
            notes: input.notes.as_str().to_string(),
            created_at: unix_millis(),
        };
        store.contacts.push(contact.clone());
        Ok(contact)
    }

    pub fn update(&self, id: u32, input: ContactInput) -> AppResult<Contact> {
        let mut store = self.lock()?;
        Self::ensure_email_is_free(&store, input.email.as_str(), Some(id))?;

        let contact = store
            .contacts
            .iter_mut()
            .find(|c| c.id == id)
            .ok_or_else(|| AppError::NotFound("El contacto".into()))?;

        contact.name = input.name.as_str().to_string();
        contact.email = input.email.as_str().to_string();
        contact.role = input.role;
        contact.notes = input.notes.as_str().to_string();
        Ok(contact.clone())
    }

    pub fn delete(&self, id: u32) -> AppResult<u32> {
        let mut store = self.lock()?;
        let antes = store.contacts.len();
        store.contacts.retain(|c| c.id != id);
        if store.contacts.len() == antes {
            return Err(AppError::NotFound("El contacto".into()));
        }
        Ok(id)
    }

    fn lock(&self) -> AppResult<std::sync::MutexGuard<'_, Store>> {
        self.store
            .lock()
            .map_err(|_| AppError::Internal("la lista de contactos quedó inservible".into()))
    }

    fn ensure_email_is_free(store: &Store, email: &str, excepto: Option<u32>) -> AppResult<()> {
        let repetido = store
            .contacts
            .iter()
            .any(|c| c.email == email && Some(c.id) != excepto);
        if repetido {
            return Err(AppError::Validation(
                "Ya hay un contacto con ese correo.".into(),
            ));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input(name: &str, email: &str, role: &str) -> ContactInput {
        ContactInput::try_from(ContactDraft {
            name: name.to_string(),
            email: email.to_string(),
            role: role.to_string(),
            notes: String::new(),
        })
        .unwrap()
    }

    #[test]
    fn crea_y_devuelve_la_lista_ordenada_por_nombre() {
        let contacts = ContactService::new();
        contacts
            .create(input("Zoe", "zoe@example.com", "viewer"))
            .unwrap();
        contacts
            .create(input("ada", "ada@example.com", "admin"))
            .unwrap();

        let lista = contacts.list().unwrap();
        assert_eq!(
            lista.iter().map(|c| c.name.as_str()).collect::<Vec<_>>(),
            ["ada", "Zoe"]
        );
        assert_eq!(lista[0].role, input("ada", "ada@example.com", "admin").role);
        assert!(lista[0].created_at > 0);
    }

    #[test]
    fn los_identificadores_no_se_reutilizan_al_borrar() {
        let contacts = ContactService::new();
        let primero = contacts
            .create(input("Ada", "ada@example.com", "admin"))
            .unwrap();
        contacts.delete(primero.id).unwrap();
        let segundo = contacts
            .create(input("Zoe", "zoe@example.com", "viewer"))
            .unwrap();

        assert_ne!(primero.id, segundo.id);
    }

    #[test]
    fn rechaza_dos_contactos_con_el_mismo_correo() {
        let contacts = ContactService::new();
        contacts
            .create(input("Ada", "ada@example.com", "admin"))
            .unwrap();

        assert_eq!(
            contacts.create(input("Otra", "ADA@example.com", "viewer")),
            Err(AppError::Validation(
                "Ya hay un contacto con ese correo.".into()
            ))
        );
    }

    #[test]
    fn actualiza_conservando_el_identificador_y_el_alta() {
        let contacts = ContactService::new();
        let creado = contacts
            .create(input("Ada", "ada@example.com", "admin"))
            .unwrap();

        let editado = contacts
            .update(
                creado.id,
                input("Ada Lovelace", "ada@example.com", "editor"),
            )
            .unwrap();

        assert_eq!(editado.id, creado.id);
        assert_eq!(editado.created_at, creado.created_at);
        assert_eq!(editado.name, "Ada Lovelace");
        assert_ne!(editado.role, creado.role);
    }

    #[test]
    fn al_editar_el_correo_propio_no_cuenta_como_repetido() {
        let contacts = ContactService::new();
        let creado = contacts
            .create(input("Ada", "ada@example.com", "admin"))
            .unwrap();
        let otro = contacts
            .create(input("Zoe", "zoe@example.com", "viewer"))
            .unwrap();

        assert!(contacts
            .update(creado.id, input("Ada L.", "ada@example.com", "admin"))
            .is_ok());
        assert_eq!(
            contacts.update(otro.id, input("Zoe", "ada@example.com", "viewer")),
            Err(AppError::Validation(
                "Ya hay un contacto con ese correo.".into()
            ))
        );
    }

    #[test]
    fn editar_o_borrar_lo_que_no_existe_avisa_en_vez_de_callar() {
        let contacts = ContactService::new();
        assert_eq!(
            contacts.update(7, input("Ada", "ada@example.com", "admin")),
            Err(AppError::NotFound("El contacto".into()))
        );
        assert_eq!(
            contacts.delete(7),
            Err(AppError::NotFound("El contacto".into()))
        );
    }

    #[test]
    fn borra_solo_el_contacto_pedido() {
        let contacts = ContactService::new();
        let ada = contacts
            .create(input("Ada", "ada@example.com", "admin"))
            .unwrap();
        contacts
            .create(input("Zoe", "zoe@example.com", "viewer"))
            .unwrap();

        assert_eq!(contacts.delete(ada.id).unwrap(), ada.id);
        let lista = contacts.list().unwrap();
        assert_eq!(lista.len(), 1);
        assert_eq!(lista[0].name, "Zoe");
    }

    #[test]
    fn la_lista_de_ejemplo_arranca_con_tres_contactos() {
        let lista = ContactService::seeded().unwrap().list().unwrap();
        assert_eq!(lista.len(), 3);
        assert_eq!(lista[0].name, "Ada Lovelace");
    }
}
