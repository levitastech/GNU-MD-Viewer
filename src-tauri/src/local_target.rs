use std::path::{Component, PathBuf};

use crate::contracts::{AppError, AppErrorCode};

/// URI path only: fragments belong to navigation, queries are unsupported.
/// Decode exactly once, then apply filesystem policy independently of the DOM.
pub(crate) fn relative_path(target: &str) -> Result<PathBuf, AppError> {
    let invalid = || {
        AppError::new(
            AppErrorCode::ResourceInvalid,
            "La référence locale est invalide.",
        )
    };
    if target.is_empty() || target.contains(['?', '#']) {
        return Err(invalid());
    }
    let bytes = target.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' {
            let hex = |byte: u8| match byte {
                b'0'..=b'9' => Some(byte - b'0'),
                b'a'..=b'f' => Some(byte - b'a' + 10),
                b'A'..=b'F' => Some(byte - b'A' + 10),
                _ => None,
            };
            let high = bytes
                .get(index + 1)
                .and_then(|&byte| hex(byte))
                .ok_or_else(invalid)?;
            let low = bytes
                .get(index + 2)
                .and_then(|&byte| hex(byte))
                .ok_or_else(invalid)?;
            decoded.push(high * 16 + low);
            index += 3;
        } else {
            decoded.push(bytes[index]);
            index += 1;
        }
    }
    let decoded = String::from_utf8(decoded).map_err(|_| invalid())?;
    if decoded.chars().any(char::is_control) || decoded.contains(['\\', ':', '?']) {
        return Err(invalid());
    }
    let path = PathBuf::from(decoded);
    if path.is_absolute()
        || path
            .components()
            .any(|part| matches!(part, Component::Prefix(_) | Component::RootDir))
    {
        return Err(AppError::new(
            AppErrorCode::ResourceOutsideRoot,
            "Les chemins absolus sont refusés.",
        ));
    }
    Ok(path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_once_without_confusing_filename_and_fragment() {
        for (target, expected) in [
            ("été%20عربي%23.md", "été عربي#.md"),
            ("literal%252e%252e.md", "literal%2e%2e.md"),
            ("100%25.md", "100%.md"),
            ("%2e%2e/assets/a.png", "../assets/a.png"),
        ] {
            assert_eq!(relative_path(target).unwrap(), PathBuf::from(expected));
        }
    }

    #[test]
    fn rejects_ambiguous_and_nonportable_targets() {
        for target in [
            "",
            "%",
            "%2",
            "%é",
            "%FF",
            "%00",
            "%0A",
            "a?x",
            "a#x",
            "%2Fetc/passwd",
            "//host/a",
            "C%3a/a",
            "a%5Cb",
            "http://x",
            "a%3Fx",
        ] {
            assert!(relative_path(target).is_err(), "{target}");
        }
    }
}
