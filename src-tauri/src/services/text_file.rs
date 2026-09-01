use std::fs;
use std::path::Path;

use crate::error::{AppError, AppResult};
use crate::models::text_file::{Codificacion, FinDeLinea, TextFile};

const TAMANO_MAXIMO: u64 = 8 * 1024 * 1024;

pub fn leer(ruta: &Path) -> AppResult<TextFile> {
    let tamano = fs::metadata(ruta)?.len();
    if tamano > TAMANO_MAXIMO {
        return Err(AppError::Validation(format!(
            "el archivo supera el límite de 8 MB ({tamano} bytes)"
        )));
    }
    let bytes = fs::read(ruta)?;
    let (texto, codificacion) = decodificar(&bytes)?;
    let (contenido, eol) = normalizar_eol(&texto);
    Ok(TextFile {
        contenido,
        eol,
        codificacion,
    })
}

pub fn escribir(
    ruta: &Path,
    contenido: &str,
    eol: FinDeLinea,
    codificacion: Codificacion,
) -> AppResult<()> {
    let restaurado = match eol {
        FinDeLinea::Lf => contenido.to_string(),
        FinDeLinea::Crlf => contenido.replace('\n', "\r\n"),
    };
    escribir_atomico(ruta, &codificar(&restaurado, codificacion))
}

fn decodificar(bytes: &[u8]) -> AppResult<(String, Codificacion)> {
    match bytes {
        [0xEF, 0xBB, 0xBF, resto @ ..] => Ok((utf8(resto)?, Codificacion::Utf8bom)),
        [0xFF, 0xFE, resto @ ..] => Ok((utf16(resto, u16::from_le_bytes)?, Codificacion::Utf16le)),
        [0xFE, 0xFF, resto @ ..] => Ok((utf16(resto, u16::from_be_bytes)?, Codificacion::Utf16be)),
        _ => {
            if bytes.contains(&0) {
                return Err(AppError::Validation("el archivo no es texto".into()));
            }
            Ok((utf8(bytes)?, Codificacion::Utf8))
        }
    }
}

fn utf8(bytes: &[u8]) -> AppResult<String> {
    String::from_utf8(bytes.to_vec())
        .map_err(|_| AppError::Validation("el archivo no es UTF-8 válido".into()))
}

fn utf16(bytes: &[u8], combinar: fn([u8; 2]) -> u16) -> AppResult<String> {
    if !bytes.len().is_multiple_of(2) {
        return Err(AppError::Validation(
            "el archivo UTF-16 está truncado".into(),
        ));
    }
    let unidades: Vec<u16> = bytes
        .chunks_exact(2)
        .map(|par| combinar([par[0], par[1]]))
        .collect();
    String::from_utf16(&unidades)
        .map_err(|_| AppError::Validation("el archivo no es UTF-16 válido".into()))
}

fn normalizar_eol(texto: &str) -> (String, FinDeLinea) {
    if texto.contains("\r\n") {
        (texto.replace("\r\n", "\n"), FinDeLinea::Crlf)
    } else {
        (texto.to_string(), FinDeLinea::Lf)
    }
}

fn codificar(texto: &str, codificacion: Codificacion) -> Vec<u8> {
    match codificacion {
        Codificacion::Utf8 => texto.as_bytes().to_vec(),
        Codificacion::Utf8bom => {
            let mut bytes = vec![0xEF, 0xBB, 0xBF];
            bytes.extend_from_slice(texto.as_bytes());
            bytes
        }
        Codificacion::Utf16le => utf16_bytes(texto, u16::to_le_bytes),
        Codificacion::Utf16be => utf16_bytes(texto, u16::to_be_bytes),
    }
}

fn utf16_bytes(texto: &str, separar: fn(u16) -> [u8; 2]) -> Vec<u8> {
    let mut bytes = separar(0xFEFF).to_vec();
    for unidad in texto.encode_utf16() {
        bytes.extend_from_slice(&separar(unidad));
    }
    bytes
}

fn escribir_atomico(ruta: &Path, bytes: &[u8]) -> AppResult<()> {
    let nombre = ruta
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| AppError::Validation("la ruta no termina en un archivo".into()))?;
    let directorio = ruta
        .parent()
        .filter(|d| !d.as_os_str().is_empty())
        .ok_or_else(|| AppError::Validation("la ruta no tiene directorio".into()))?;
    let temporal = directorio.join(format!("{nombre}.tmp~"));
    fs::write(&temporal, bytes)?;
    if let Err(e) = fs::rename(&temporal, ruta) {
        let _ = fs::remove_file(&temporal);
        return Err(e.into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicUsize, Ordering};

    use super::*;

    static CONTADOR: AtomicUsize = AtomicUsize::new(0);

    fn ruta_temporal(nombre: &str) -> PathBuf {
        let n = CONTADOR.fetch_add(1, Ordering::Relaxed);
        let dir = std::env::temp_dir().join(format!("demo-text-file-{}-{n}", std::process::id()));
        fs::create_dir_all(&dir).expect("crear dir temporal");
        dir.join(nombre)
    }

    fn roundtrip(bytes: &[u8], esperado: &TextFile) {
        let ruta = ruta_temporal("caso.sql");
        fs::write(&ruta, bytes).expect("escribir fixture");

        let leido = leer(&ruta).expect("leer");
        assert_eq!(&leido, esperado);

        escribir(&ruta, &leido.contenido, leido.eol, leido.codificacion).expect("escribir");
        assert_eq!(fs::read(&ruta).expect("releer"), bytes);
    }

    #[test]
    fn roundtrip_utf8_lf() {
        roundtrip(
            b"SELECT 1;\nSELECT 2;\n",
            &TextFile {
                contenido: "SELECT 1;\nSELECT 2;\n".into(),
                eol: FinDeLinea::Lf,
                codificacion: Codificacion::Utf8,
            },
        );
    }

    #[test]
    fn roundtrip_utf8_bom_crlf() {
        roundtrip(
            b"\xEF\xBB\xBFSELECT 'a\xC3\xB1o';\r\n",
            &TextFile {
                contenido: "SELECT 'año';\n".into(),
                eol: FinDeLinea::Crlf,
                codificacion: Codificacion::Utf8bom,
            },
        );
    }

    #[test]
    fn roundtrip_utf16_le() {
        let mut bytes = vec![0xFF, 0xFE];
        for unidad in "SELECT 'año';\r\n".encode_utf16() {
            bytes.extend_from_slice(&unidad.to_le_bytes());
        }
        roundtrip(
            &bytes,
            &TextFile {
                contenido: "SELECT 'año';\n".into(),
                eol: FinDeLinea::Crlf,
                codificacion: Codificacion::Utf16le,
            },
        );
    }

    #[test]
    fn roundtrip_utf16_be() {
        let mut bytes = vec![0xFE, 0xFF];
        for unidad in "SELECT 1;\n".encode_utf16() {
            bytes.extend_from_slice(&unidad.to_be_bytes());
        }
        roundtrip(
            &bytes,
            &TextFile {
                contenido: "SELECT 1;\n".into(),
                eol: FinDeLinea::Lf,
                codificacion: Codificacion::Utf16be,
            },
        );
    }

    #[test]
    fn rechaza_binario() {
        let ruta = ruta_temporal("binario.dat");
        fs::write(&ruta, b"MZ\x00\x01\x02").expect("escribir fixture");
        assert!(matches!(leer(&ruta), Err(AppError::Validation(_))));
    }

    #[test]
    fn rechaza_utf16_truncado() {
        let ruta = ruta_temporal("truncado.sql");
        fs::write(&ruta, b"\xFF\xFES\x00E").expect("escribir fixture");
        assert!(matches!(leer(&ruta), Err(AppError::Validation(_))));
    }

    #[test]
    fn rechaza_mas_de_8mb() {
        let ruta = ruta_temporal("enorme.sql");
        fs::write(&ruta, vec![b'a'; (TAMANO_MAXIMO + 1) as usize]).expect("escribir fixture");
        assert!(matches!(leer(&ruta), Err(AppError::Validation(_))));
    }

    #[test]
    fn escribir_reemplaza_sin_dejar_temporal() {
        let ruta = ruta_temporal("existente.sql");
        fs::write(&ruta, b"viejo").expect("escribir fixture");

        escribir(&ruta, "nuevo\n", FinDeLinea::Lf, Codificacion::Utf8).expect("escribir");

        assert_eq!(fs::read(&ruta).expect("releer"), b"nuevo\n");
        assert!(!ruta.with_file_name("existente.sql.tmp~").exists());
    }
}
