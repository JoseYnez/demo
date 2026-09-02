use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use argon2::password_hash::phc::PasswordHash;
use argon2::password_hash::{PasswordHasher, PasswordVerifier};
use argon2::Argon2;

use crate::error::{AppError, AppResult};
use crate::models::{Password, Session, Username};

pub const DEMO_USERNAME: &str = "demo";
pub const DEMO_DISPLAY_NAME: &str = "Cuenta de demostración";
pub const DEMO_PASSWORD: &str = "demo1234";

#[derive(Debug, Clone, Copy)]
pub struct LockoutPolicy {
    pub max_failures: u32,
    pub lock_for: Duration,
}

impl Default for LockoutPolicy {
    fn default() -> Self {
        Self {
            max_failures: 5,
            lock_for: Duration::from_secs(30),
        }
    }
}

struct UserRecord {
    display_name: String,
    password_hash: String,
}

#[derive(Default)]
struct Attempts {
    failures: u32,
    locked_until: Option<Instant>,
}

pub struct AuthService {
    hasher: Argon2<'static>,
    users: HashMap<String, UserRecord>,
    decoy_hash: String,
    attempts: Mutex<HashMap<String, Attempts>>,
    policy: LockoutPolicy,
}

impl AuthService {
    pub fn new(policy: LockoutPolicy) -> AppResult<Self> {
        let hasher = Argon2::default();
        let decoy_hash = hash(&hasher, b"decoy-que-nunca-coincide")?;
        Ok(Self {
            hasher,
            users: HashMap::new(),
            decoy_hash,
            attempts: Mutex::new(HashMap::new()),
            policy,
        })
    }

    pub fn demo() -> AppResult<Self> {
        Self::new(LockoutPolicy::default())?.with_user(
            DEMO_USERNAME,
            DEMO_DISPLAY_NAME,
            DEMO_PASSWORD,
        )
    }

    pub fn with_user(
        mut self,
        username: &str,
        display_name: &str,
        password: &str,
    ) -> AppResult<Self> {
        let username = Username::try_from(username.to_string())?;
        let password_hash = hash(&self.hasher, password.as_bytes())?;
        self.users.insert(
            username.as_str().to_string(),
            UserRecord {
                display_name: display_name.to_string(),
                password_hash,
            },
        );
        Ok(self)
    }

    pub fn login(&self, username: &Username, password: &Password) -> AppResult<Session> {
        self.login_at(username, password, Instant::now())
    }

    fn login_at(
        &self,
        username: &Username,
        password: &Password,
        now: Instant,
    ) -> AppResult<Session> {
        if let Some(remaining) = self.lock_remaining(username, now) {
            return Err(AppError::Locked(remaining.as_secs().max(1)));
        }

        let user = self.users.get(username.as_str());
        let stored_hash = user.map_or(self.decoy_hash.as_str(), |u| u.password_hash.as_str());
        let matches = self.verify(stored_hash, password) && user.is_some();

        match user {
            Some(user) if matches => {
                self.clear_failures(username);
                Ok(Session {
                    username: username.as_str().to_string(),
                    display_name: user.display_name.clone(),
                    issued_at: unix_millis(),
                })
            }
            _ => Err(self.register_failure(username, now)),
        }
    }

    fn verify(&self, stored_hash: &str, password: &Password) -> bool {
        PasswordHash::new(stored_hash)
            .map(|parsed| {
                self.hasher
                    .verify_password(password.as_bytes(), &parsed)
                    .is_ok()
            })
            .unwrap_or(false)
    }

    fn lock_remaining(&self, username: &Username, now: Instant) -> Option<Duration> {
        let attempts = self.attempts.lock().ok()?;
        let until = attempts.get(username.as_str())?.locked_until?;
        (until > now).then(|| until - now)
    }

    fn register_failure(&self, username: &Username, now: Instant) -> AppError {
        let Ok(mut attempts) = self.attempts.lock() else {
            return AppError::InvalidCredentials;
        };
        let entry = attempts.entry(username.as_str().to_string()).or_default();
        entry.failures += 1;
        if entry.failures >= self.policy.max_failures {
            entry.failures = 0;
            entry.locked_until = Some(now + self.policy.lock_for);
            return AppError::Locked(self.policy.lock_for.as_secs().max(1));
        }
        AppError::InvalidCredentials
    }

    fn clear_failures(&self, username: &Username) {
        if let Ok(mut attempts) = self.attempts.lock() {
            attempts.remove(username.as_str());
        }
    }
}

fn hash(hasher: &Argon2<'_>, password: &[u8]) -> AppResult<String> {
    hasher
        .hash_password(password)
        .map(|h| h.to_string())
        .map_err(|e| AppError::Internal(format!("no se pudo derivar el hash: {e}")))
}

fn unix_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn service() -> AuthService {
        AuthService::new(LockoutPolicy {
            max_failures: 3,
            lock_for: Duration::from_secs(30),
        })
        .unwrap()
        .with_user("Ada", "Ada Lovelace", "hunter42")
        .unwrap()
    }

    fn username(raw: &str) -> Username {
        Username::try_from(raw.to_string()).unwrap()
    }

    fn password(raw: &str) -> Password {
        Password::try_from(raw.to_string()).unwrap()
    }

    #[test]
    fn acepta_las_credenciales_correctas_sin_distinguir_mayusculas() {
        let session = service()
            .login(&username("ADA"), &password("hunter42"))
            .unwrap();
        assert_eq!(session.username, "ada");
        assert_eq!(session.display_name, "Ada Lovelace");
        assert!(session.issued_at > 0);
    }

    #[test]
    fn rechaza_la_contrasena_equivocada_con_el_mismo_error_que_un_usuario_inexistente() {
        let auth = service();
        let mala = auth.login(&username("ada"), &password("otra"));
        let ajeno = auth.login(&username("nadie"), &password("hunter42"));
        assert_eq!(mala, Err(AppError::InvalidCredentials));
        assert_eq!(ajeno, Err(AppError::InvalidCredentials));
    }

    #[test]
    fn bloquea_al_agotar_los_intentos_y_libera_al_expirar() {
        let auth = service();
        let t0 = Instant::now();
        let ada = username("ada");

        assert_eq!(
            auth.login_at(&ada, &password("mal"), t0),
            Err(AppError::InvalidCredentials)
        );
        assert_eq!(
            auth.login_at(&ada, &password("mal"), t0),
            Err(AppError::InvalidCredentials)
        );
        assert_eq!(
            auth.login_at(&ada, &password("mal"), t0),
            Err(AppError::Locked(30))
        );

        let bloqueado = auth.login_at(&ada, &password("hunter42"), t0 + Duration::from_secs(10));
        assert_eq!(bloqueado, Err(AppError::Locked(20)));

        let liberado = auth.login_at(&ada, &password("hunter42"), t0 + Duration::from_secs(31));
        assert!(liberado.is_ok());
    }

    #[test]
    fn el_bloqueo_no_revela_si_el_usuario_existe() {
        let auth = service();
        let t0 = Instant::now();
        let nadie = username("nadie");
        for _ in 0..2 {
            auth.login_at(&nadie, &password("x"), t0).unwrap_err();
        }
        assert_eq!(
            auth.login_at(&nadie, &password("x"), t0),
            Err(AppError::Locked(30))
        );
    }

    #[test]
    fn un_acceso_correcto_pone_el_contador_a_cero() {
        let auth = service();
        let t0 = Instant::now();
        let ada = username("ada");
        auth.login_at(&ada, &password("mal"), t0).unwrap_err();
        auth.login_at(&ada, &password("mal"), t0).unwrap_err();
        auth.login_at(&ada, &password("hunter42"), t0).unwrap();

        auth.login_at(&ada, &password("mal"), t0).unwrap_err();
        assert_eq!(
            auth.login_at(&ada, &password("mal"), t0),
            Err(AppError::InvalidCredentials)
        );
    }

    #[test]
    fn la_cuenta_de_demostracion_entra_con_sus_credenciales() {
        let auth = AuthService::demo().unwrap();
        let session = auth
            .login(&username(DEMO_USERNAME), &password(DEMO_PASSWORD))
            .unwrap();
        assert_eq!(session.display_name, DEMO_DISPLAY_NAME);
    }
}
