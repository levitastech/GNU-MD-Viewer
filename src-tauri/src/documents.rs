use std::{
    collections::{HashMap, HashSet},
    fs::{File, Metadata},
    io::Read,
    path::{Path, PathBuf},
    sync::Mutex,
    time::SystemTime,
};

use serde::{Deserialize, Serialize};

use crate::contracts::{AppError, AppErrorCode};

pub const MAX_DOCUMENT_ENCODED_BYTES: usize = 20_000_000;
const MAX_PENDING_SELECTIONS: usize = 16;
const ALLOWED_EXTENSIONS: &[&str] = &["md", "markdown", "mdown", "mkd"];

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentSelection {
    pub paths: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentSnapshot {
    pub document_id: String,
    pub session_id: String,
    pub text: String,
    pub display_name: String,
    pub encoding: &'static str,
    pub revision: u64,
}

pub struct OpenedDocument {
    pub snapshot: DocumentSnapshot,
    pub path: PathBuf,
}

#[derive(Clone)]
struct PendingSelection {
    path: PathBuf,
    identity: FileIdentity,
}

#[derive(Default)]
struct RegistryState {
    pending: HashMap<String, PendingSelection>,
    sessions: HashSet<String>,
}

#[derive(Default)]
pub struct DocumentRegistry {
    state: Mutex<RegistryState>,
}

impl DocumentRegistry {
    pub fn authorize_path(&self, path: &Path) -> Result<DocumentSelection, AppError> {
        let canonical = path.canonicalize().map_err(path_error)?;
        validate_extension(&canonical)?;
        let metadata = canonical.metadata().map_err(path_error)?;
        validate_regular_file(&metadata)?;

        let token = random_token()?;
        let mut state = self.state.lock().expect("registre de documents empoisonné");
        if state.pending.len() >= MAX_PENDING_SELECTIONS {
            state.pending.clear();
        }
        state.pending.insert(
            token.clone(),
            PendingSelection {
                path: canonical,
                identity: file_identity(&metadata),
            },
        );

        Ok(DocumentSelection { paths: vec![token] })
    }

    pub fn open_first(&self, selection: &DocumentSelection) -> Result<OpenedDocument, AppError> {
        self.open_first_with_after_metadata(selection, || {})
    }

    fn open_first_with_after_metadata<F>(
        &self,
        selection: &DocumentSelection,
        after_metadata: F,
    ) -> Result<OpenedDocument, AppError>
    where
        F: FnOnce(),
    {
        let token = selection.paths.first().ok_or_else(|| {
            AppError::new(
                AppErrorCode::DocumentNotFound,
                "Aucun document n'a été sélectionné.",
            )
        })?;
        let pending = self
            .state
            .lock()
            .expect("registre de documents empoisonné")
            .pending
            .remove(token)
            .ok_or_else(|| {
                AppError::new(
                    AppErrorCode::AccessDenied,
                    "La sélection de document est inconnue ou a expiré.",
                )
            })?;

        let mut file = File::open(&pending.path).map_err(open_error)?;
        let before = file.metadata().map_err(open_error)?;
        validate_regular_file(&before)?;
        if file_identity(&before) != pending.identity {
            return Err(AppError::new(
                AppErrorCode::AccessDenied,
                "Le document sélectionné a été remplacé avant son ouverture.",
            ));
        }
        if before.len() > MAX_DOCUMENT_ENCODED_BYTES as u64 {
            return Err(document_too_large());
        }

        after_metadata();

        let mut bytes = Vec::with_capacity(before.len() as usize);
        file.by_ref()
            .take((MAX_DOCUMENT_ENCODED_BYTES + 1) as u64)
            .read_to_end(&mut bytes)
            .map_err(read_error)?;
        if bytes.len() > MAX_DOCUMENT_ENCODED_BYTES {
            return Err(document_too_large());
        }

        let after = file.metadata().map_err(read_error)?;
        if metadata_changed(&before, &after) {
            return Err(AppError::new(
                AppErrorCode::AccessDenied,
                "Le document a changé pendant sa lecture ; réessayez.",
            ));
        }

        let decoded = std::str::from_utf8(&bytes).map_err(|_| {
            AppError::new(
                AppErrorCode::InvalidUtf8,
                "Le document n'est pas encodé en UTF-8 valide.",
            )
        })?;
        let text = decoded
            .strip_prefix('\u{feff}')
            .unwrap_or(decoded)
            .to_owned();
        let document_id = random_token()?;
        let session_id = random_token()?;
        let display_name = pending
            .path
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_else(|| "document Markdown".to_owned());

        let snapshot = DocumentSnapshot {
            document_id: document_id.clone(),
            session_id: session_id.clone(),
            text,
            display_name,
            encoding: "utf-8",
            revision: 1,
        };

        self.state
            .lock()
            .expect("registre de documents empoisonné")
            .sessions
            .insert(session_id);

        Ok(OpenedDocument {
            snapshot,
            path: pending.path,
        })
    }

    pub fn release_session(&self, session_id: &str) {
        self.state
            .lock()
            .expect("registre de documents empoisonné")
            .sessions
            .remove(session_id);
    }

    #[cfg(test)]
    fn contains_session(&self, session_id: &str) -> bool {
        self.state
            .lock()
            .expect("registre de documents empoisonné")
            .sessions
            .contains(session_id)
    }
}

fn validate_extension(path: &Path) -> Result<(), AppError> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase);
    if extension
        .as_deref()
        .is_some_and(|value| ALLOWED_EXTENSIONS.contains(&value))
    {
        Ok(())
    } else {
        Err(AppError::new(
            AppErrorCode::UnsupportedFormat,
            "Seuls les fichiers .md, .markdown, .mdown et .mkd sont acceptés.",
        ))
    }
}

fn validate_regular_file(metadata: &Metadata) -> Result<(), AppError> {
    if metadata.file_type().is_file() {
        Ok(())
    } else {
        Err(AppError::new(
            AppErrorCode::UnsupportedFormat,
            "La sélection n'est pas un fichier ordinaire.",
        ))
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct FileIdentity {
    #[cfg(unix)]
    device: u64,
    #[cfg(unix)]
    inode: u64,
    len: u64,
    modified: Option<SystemTime>,
}

fn file_identity(metadata: &Metadata) -> FileIdentity {
    #[cfg(unix)]
    use std::os::unix::fs::MetadataExt;

    FileIdentity {
        #[cfg(unix)]
        device: metadata.dev(),
        #[cfg(unix)]
        inode: metadata.ino(),
        len: metadata.len(),
        modified: metadata.modified().ok(),
    }
}

fn metadata_changed(before: &Metadata, after: &Metadata) -> bool {
    file_identity(before) != file_identity(after)
}

fn random_token() -> Result<String, AppError> {
    let mut bytes = [0_u8; 32];
    getrandom::fill(&mut bytes).map_err(|_| {
        AppError::new(
            AppErrorCode::AccessDenied,
            "Impossible de créer une autorisation de document sûre.",
        )
    })?;
    Ok(bytes.iter().map(|byte| format!("{byte:02x}")).collect())
}

fn path_error(error: std::io::Error) -> AppError {
    match error.kind() {
        std::io::ErrorKind::NotFound => AppError::new(
            AppErrorCode::DocumentNotFound,
            "Le document sélectionné est absent.",
        ),
        std::io::ErrorKind::PermissionDenied => AppError::new(
            AppErrorCode::AccessDenied,
            "L'accès au document sélectionné est refusé.",
        ),
        _ => AppError::new(
            AppErrorCode::AccessDenied,
            "Le document sélectionné ne peut pas être vérifié.",
        ),
    }
}

fn open_error(error: std::io::Error) -> AppError {
    path_error(error)
}

fn read_error(_error: std::io::Error) -> AppError {
    AppError::new(
        AppErrorCode::AccessDenied,
        "La lecture du document a échoué.",
    )
}

fn document_too_large() -> AppError {
    AppError::new(
        AppErrorCode::DocumentTooLarge,
        "Le document dépasse la limite de 20 Mo.",
    )
}

#[cfg(test)]
mod tests {
    use std::{fs, hash::Hasher};

    use tempfile::tempdir;

    use super::*;

    fn checksum(path: &Path) -> u64 {
        let bytes = fs::read(path).unwrap();
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        hasher.write(&bytes);
        hasher.finish()
    }

    #[test]
    fn opens_utf8_bom_and_crlf_without_modifying_the_source() {
        let directory = tempdir().unwrap();
        let path = directory.path().join("présentation.markdown");
        fs::write(&path, b"\xef\xbb\xbf# Titre\r\n\r\nTexte\r\n").unwrap();
        let before = checksum(&path);
        let registry = DocumentRegistry::default();
        let selection = registry.authorize_path(&path).unwrap();

        let opened = registry.open_first(&selection).unwrap();

        assert_eq!(opened.snapshot.text, "# Titre\r\n\r\nTexte\r\n");
        assert_eq!(opened.snapshot.display_name, "présentation.markdown");
        assert_eq!(checksum(&path), before);
        assert!(registry.contains_session(&opened.snapshot.session_id));
    }

    #[test]
    fn rejects_unknown_reused_and_forged_selection_tokens() {
        let directory = tempdir().unwrap();
        let path = directory.path().join("document.md");
        fs::write(&path, "# document").unwrap();
        let registry = DocumentRegistry::default();
        let selection = registry.authorize_path(&path).unwrap();

        registry.open_first(&selection).unwrap();
        for invalid in [
            selection,
            DocumentSelection {
                paths: vec!["forged".into()],
            },
        ] {
            assert!(matches!(
                registry.open_first(&invalid),
                Err(AppError {
                    code: AppErrorCode::AccessDenied,
                    ..
                })
            ));
        }
    }

    #[test]
    fn rejects_invalid_utf8_wrong_suffix_directory_and_oversized_file() {
        let directory = tempdir().unwrap();
        let registry = DocumentRegistry::default();

        assert!(matches!(
            registry.authorize_path(&directory.path().join("absent.md")),
            Err(AppError {
                code: AppErrorCode::DocumentNotFound,
                ..
            })
        ));

        let invalid = directory.path().join("invalid.md");
        fs::write(&invalid, [0xff, 0xfe]).unwrap();
        let selection = registry.authorize_path(&invalid).unwrap();
        assert!(matches!(
            registry.open_first(&selection),
            Err(AppError {
                code: AppErrorCode::InvalidUtf8,
                ..
            })
        ));

        let suffix = directory.path().join("document.md.exe");
        fs::write(&suffix, "# faux").unwrap();
        assert!(matches!(
            registry.authorize_path(&suffix),
            Err(AppError {
                code: AppErrorCode::UnsupportedFormat,
                ..
            })
        ));

        let folder = directory.path().join("folder.md");
        fs::create_dir(&folder).unwrap();
        assert!(matches!(
            registry.authorize_path(&folder),
            Err(AppError {
                code: AppErrorCode::UnsupportedFormat,
                ..
            })
        ));

        let oversized = directory.path().join("large.md");
        File::create(&oversized)
            .unwrap()
            .set_len((MAX_DOCUMENT_ENCODED_BYTES + 1) as u64)
            .unwrap();
        let selection = registry.authorize_path(&oversized).unwrap();
        assert!(matches!(
            registry.open_first(&selection),
            Err(AppError {
                code: AppErrorCode::DocumentTooLarge,
                ..
            })
        ));
    }

    #[test]
    fn rejects_a_document_that_changes_after_metadata_was_checked() {
        let directory = tempdir().unwrap();
        let path = directory.path().join("changing.md");
        fs::write(&path, "# avant").unwrap();
        let registry = DocumentRegistry::default();
        let selection = registry.authorize_path(&path).unwrap();

        let result = registry.open_first_with_after_metadata(&selection, || {
            fs::write(&path, "# contenu remplacé pendant la lecture").unwrap();
        });

        assert!(matches!(
            result,
            Err(AppError {
                code: AppErrorCode::AccessDenied,
                ..
            })
        ));
    }

    #[cfg(unix)]
    #[test]
    fn rejects_a_special_file_selected_through_a_markdown_symlink() {
        use std::os::unix::fs::symlink;

        let directory = tempdir().unwrap();
        let path = directory.path().join("device.md");
        symlink("/dev/null", &path).unwrap();
        let registry = DocumentRegistry::default();

        assert!(matches!(
            registry.authorize_path(&path),
            Err(AppError {
                code: AppErrorCode::UnsupportedFormat,
                ..
            })
        ));
    }

    #[cfg(unix)]
    #[test]
    fn reports_access_denied_for_an_unreadable_authorized_file() {
        use std::os::unix::fs::PermissionsExt;

        let directory = tempdir().unwrap();
        let path = directory.path().join("private.md");
        fs::write(&path, "# privé").unwrap();
        let registry = DocumentRegistry::default();
        let selection = registry.authorize_path(&path).unwrap();
        fs::set_permissions(&path, fs::Permissions::from_mode(0o000)).unwrap();

        let result = registry.open_first(&selection);
        fs::set_permissions(&path, fs::Permissions::from_mode(0o600)).unwrap();

        assert!(matches!(
            result,
            Err(AppError {
                code: AppErrorCode::AccessDenied,
                ..
            })
        ));
    }
}
