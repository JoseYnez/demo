use tauri::State;

use crate::error::AppResult;
use crate::models::{Contact, ContactDraft, ContactInput};
use crate::services::ContactService;

#[tauri::command]
pub fn list_contacts(contacts: State<'_, ContactService>) -> AppResult<Vec<Contact>> {
    contacts.list()
}

#[tauri::command]
pub fn create_contact(
    contacts: State<'_, ContactService>,
    draft: ContactDraft,
) -> AppResult<Contact> {
    contacts.create(ContactInput::try_from(draft)?)
}

#[tauri::command]
pub fn update_contact(
    contacts: State<'_, ContactService>,
    id: u32,
    draft: ContactDraft,
) -> AppResult<Contact> {
    contacts.update(id, ContactInput::try_from(draft)?)
}

#[tauri::command]
pub fn delete_contact(contacts: State<'_, ContactService>, id: u32) -> AppResult<u32> {
    contacts.delete(id)
}
