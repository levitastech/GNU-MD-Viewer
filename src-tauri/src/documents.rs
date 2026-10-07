use std::{
    collections::HashMap,
    fs::{File, Metadata},
    io::Read,
    path::{Path, PathBuf},
    sync::Mutex,
    time::SystemTime,
};

use serde::{Deserialize, Serialize};

use crate::contracts::{AppError, AppErrorCode};
use crate::resources::{RootIdentity, root_identity, verify_opened_file_is_confined};

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
    pub(crate) root: PathBuf,
    pub(crate) root_identity: RootIdentity,
}

#[derive(Clone)]
struct PendingSelection {
    path: PathBuf,
    identity: FileIdentity,
    root: PathBuf,
    root_identity: RootIdentity,
    parent_session: Option<String>,
}

#[derive(Clone)]
struct DocumentSession {
    path: PathBuf,
    root: PathBuf,
    root_identity: RootIdentity,
    watch_identity: FileIdentity,
    watch_pending: Option<FileIdentity>,
}

#[derive(Default)]
struct RegistryState {
    pending: HashMap<String, PendingSelection>,
    sessions: HashMap<String, DocumentSession>,
}

#[derive(Default)]
pub struct DocumentRegistry {
    state: Mutex<RegistryState>,
}

impl DocumentRegistry {
    pub fn authorize_path(&self, path: &Path) -> Result<DocumentSelection, AppError> {
        let canonical = path.canonicalize().map_err(path_error)?;
        let root = canonical
            .parent()
            .ok_or_else(|| AppError::new(AppErrorCode::AccessDenied, "Racine absente."))?
            .to_path_buf();
        let identity = root_identity(&root)?;
        self.authorize_confined(canonical, root, identity, None)
    }

    fn authorize_confined(
        &self,
        canonical: PathBuf,
        root: PathBuf,
        root_identity: RootIdentity,
        parent_session: Option<String>,
    ) -> Result<DocumentSelection, AppError> {
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
                root,
                root_identity,
                parent_session,
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

        if let Some(parent) = &pending.parent_session
            && !self
                .state
                .lock()
                .expect("registre de documents empoisonné")
                .sessions
                .contains_key(parent)
        {
            return Err(AppError::new(
                AppErrorCode::AccessDenied,
                "La session source est révoquée.",
            ));
        }
        let mut file = File::open(&pending.path).map_err(open_error)?;
        if pending.parent_session.is_some() {
            verify_opened_file_is_confined(&file, &pending.root, pending.root_identity)?;
        }
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

        let mut state = self.state.lock().expect("registre de documents empoisonné");
        if pending
            .parent_session
            .as_ref()
            .is_some_and(|parent| !state.sessions.contains_key(parent))
        {
            return Err(AppError::new(
                AppErrorCode::AccessDenied,
                "La session source a été révoquée pendant la lecture.",
            ));
        }
        state.sessions.insert(
            session_id,
            DocumentSession {
                path: pending.path.clone(),
                root: pending.root.clone(),
                root_identity: pending.root_identity,
                watch_identity: file_identity(&after),
                watch_pending: None,
            },
        );

        Ok(OpenedDocument {
            snapshot,
            path: pending.path,
            root: pending.root,
            root_identity: pending.root_identity,
        })
    }

    /// Native metadata polling: only the current authorized path, no directory scan.
    /// A change must remain stable across two polls (150 ms apart in the reader).
    pub fn poll_document(&self, session_id: &str) -> Result<bool, AppError> {
        let mut state = self.state.lock().expect("registre de documents empoisonné");
        let document = state
            .sessions
            .get_mut(session_id)
            .ok_or_else(|| AppError::new(AppErrorCode::AccessDenied, "Session révoquée."))?;
        if root_identity(&document.root)? != document.root_identity {
            return Err(AppError::new(
                AppErrorCode::ResourceOutsideRoot,
                "Racine remplacée.",
            ));
        }
        let candidate = document.path.canonicalize().map_err(path_error)?;
        if !candidate.starts_with(&document.root) {
            return Err(AppError::new(
                AppErrorCode::ResourceOutsideRoot,
                "Document sorti du dossier autorisé.",
            ));
        }
        let metadata = candidate.metadata().map_err(path_error)?;
        validate_regular_file(&metadata)?;
        let identity = file_identity(&metadata);
        if identity == document.watch_identity {
            document.watch_pending = None;
            return Ok(false);
        }
        if document.watch_pending == Some(identity) {
            document.watch_identity = identity;
            document.watch_pending = None;
            return Ok(true);
        }
        document.watch_pending = Some(identity);
        Ok(false)
    }

    pub fn authorize_reload(&self, session_id: &str) -> Result<DocumentSelection, AppError> {
        let document = self
            .state
            .lock()
            .expect("registre de documents empoisonné")
            .sessions
            .get(session_id)
            .cloned()
            .ok_or_else(|| AppError::new(AppErrorCode::AccessDenied, "Session révoquée."))?;
        if root_identity(&document.root)? != document.root_identity {
            return Err(AppError::new(
                AppErrorCode::ResourceOutsideRoot,
                "Racine remplacée.",
            ));
        }
        let candidate = document.path.canonicalize().map_err(path_error)?;
        if !candidate.starts_with(&document.root) {
            return Err(AppError::new(
                AppErrorCode::ResourceOutsideRoot,
                "Document sorti du dossier autorisé.",
            ));
        }
        self.authorize_confined(
            candidate,
            document.root,
            document.root_identity,
            Some(session_id.to_owned()),
        )
    }

    pub fn release_session(&self, session_id: &str) {
        let mut state = self.state.lock().expect("registre de documents empoisonné");
        state.sessions.remove(session_id);
        state
            .pending
            .retain(|_, selection| selection.parent_session.as_deref() != Some(session_id));
    }

    pub fn authorize_relative(
        &self,
        session_id: &str,
        target: &str,
    ) -> Result<DocumentSelection, AppError> {
        let target = crate::local_target::relative_path(target)?;
        let document = self
            .state
            .lock()
            .expect("registre de documents empoisonné")
            .sessions
            .get(session_id)
            .cloned()
            .ok_or_else(|| {
                AppError::new(
                    AppErrorCode::AccessDenied,
                    "La session du document est révoquée.",
                )
            })?;
        if root_identity(&document.root)? != document.root_identity {
            return Err(AppError::new(
                AppErrorCode::ResourceOutsideRoot,
                "La racine autorisée a été remplacée.",
            ));
        }
        let base = document.path.parent().ok_or_else(|| {
            AppError::new(AppErrorCode::AccessDenied, "Le document n'a pas de racine.")
        })?;
        let candidate = base.join(target).canonicalize().map_err(path_error)?;
        if !candidate.starts_with(&document.root) {
            return Err(AppError::new(
                AppErrorCode::ResourceOutsideRoot,
                "La cible sort du dossier autorisé.",
            ));
        }
        self.authorize_confined(
            candidate,
            document.root,
            document.root_identity,
            Some(session_id.to_owned()),
        )
    }

    #[cfg(test)]
    fn contains_session(&self, session_id: &str) -> bool {
        self.state
            .lock()
            .expect("registre de documents empoisonné")
            .sessions
            .contains_key(session_id)
    }

    /// Called only with a folder returned by the native picker, never a DOM path.
    pub fn authorize_extended_root(
        &self,
        session_id: &str,
        selected: &Path,
    ) -> Result<DocumentSelection, AppError> {
        let document = self
            .state
            .lock()
            .expect("registre de documents empoisonné")
            .sessions
            .get(session_id)
            .cloned()
            .ok_or_else(|| AppError::new(AppErrorCode::AccessDenied, "Session révoquée."))?;
        let root = selected.canonicalize().map_err(path_error)?;
        let homes: Vec<_> = ["HOME", "USERPROFILE"]
            .into_iter()
            .filter_map(std::env::var_os)
            .filter_map(|home| PathBuf::from(home).canonicalize().ok())
            .collect();
        let global = homes.is_empty() || homes.iter().any(|home| home.starts_with(&root));
        if root.parent().is_none() || global || !document.root.starts_with(&root) || !root.is_dir()
        {
            return Err(AppError::new(
                AppErrorCode::AccessDenied,
                "Choisir un dossier parent ou projet, jamais une racine globale ou home.",
            ));
        }
        if root_identity(&document.root)? != document.root_identity {
            return Err(AppError::new(
                AppErrorCode::ResourceOutsideRoot,
                "La racine autorisée a été remplacée.",
            ));
        }
        let identity = root_identity(&root)?;
        self.authorize_confined(document.path, root, identity, Some(session_id.to_owned()))
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
    #[cfg(unix)]
    change_time: (i64, i64),
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
        #[cfg(unix)]
        change_time: (metadata.ctime(), metadata.ctime_nsec()),
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

    #[test]
    fn watch_coalesces_replacements_deletion_recreation_and_releases_sessions() {
        let directory = tempdir().unwrap();
        let path = directory.path().join("document.md");
        fs::write(&path, "# avant").unwrap();
        let registry = DocumentRegistry::default();
        let opened = registry
            .open_first(&registry.authorize_path(&path).unwrap())
            .unwrap();
        let session = &opened.snapshot.session_id;
        assert!(!registry.poll_document(session).unwrap());
        fs::write(&path, "# premier changement").unwrap();
        assert!(!registry.poll_document(session).unwrap());
        fs::write(directory.path().join("temp.md"), "# remplacement atomique").unwrap();
        fs::rename(directory.path().join("temp.md"), &path).unwrap();
        assert!(!registry.poll_document(session).unwrap());
        assert!(registry.poll_document(session).unwrap());
        let next = registry
            .open_first(&registry.authorize_reload(session).unwrap())
            .unwrap();
        assert_eq!(next.snapshot.text, "# remplacement atomique");
        registry.release_session(&next.snapshot.session_id);
        fs::remove_file(&path).unwrap();
        assert!(registry.poll_document(session).is_err());
        fs::write(&path, "# retour").unwrap();
        assert!(!registry.poll_document(session).unwrap());
        assert!(registry.poll_document(session).unwrap());
        registry.release_session(session);
        assert!(registry.poll_document(session).is_err());
        assert!(registry.authorize_reload(session).is_err());
        assert!(registry.state.lock().unwrap().sessions.is_empty());
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn reload_refuses_symlink_escape_and_revalidates_opened_handle() {
        use std::os::unix::fs::symlink;
        let (directory, registry, opened) = relative_fixture();
        let session = &opened.snapshot.session_id;
        let path = directory.path().join("root/a.md");
        fs::remove_file(&path).unwrap();
        symlink(directory.path().join("outside.md"), &path).unwrap();
        assert!(registry.poll_document(session).is_err());
        assert!(registry.authorize_reload(session).is_err());
    }

    fn relative_fixture() -> (tempfile::TempDir, DocumentRegistry, OpenedDocument) {
        let directory = tempdir().unwrap();
        fs::create_dir_all(directory.path().join("root/sub")).unwrap();
        fs::write(directory.path().join("root/a.md"), "# A").unwrap();
        fs::write(directory.path().join("root/sub/b.md"), "# B").unwrap();
        fs::write(directory.path().join("root/c.md"), "# C").unwrap();
        fs::write(directory.path().join("outside.md"), "# dehors").unwrap();
        let registry = DocumentRegistry::default();
        let selection = registry
            .authorize_path(&directory.path().join("root/a.md"))
            .unwrap();
        let opened = registry.open_first(&selection).unwrap();
        (directory, registry, opened)
    }

    #[test]
    fn relative_navigation_preserves_root_and_changes_document_base() {
        let (_directory, registry, a) = relative_fixture();
        let selection = registry
            .authorize_relative(&a.snapshot.session_id, "sub/b.md")
            .unwrap();
        let b = registry.open_first(&selection).unwrap();
        registry.release_session(&a.snapshot.session_id);
        assert_eq!(b.snapshot.text, "# B");
        let selection = registry
            .authorize_relative(&b.snapshot.session_id, "../c.md")
            .unwrap();
        assert_eq!(
            registry.open_first(&selection).unwrap().snapshot.text,
            "# C"
        );
    }

    #[test]
    fn encoded_document_names_are_decoded_once_and_still_confined() {
        let (directory, registry, a) = relative_fixture();
        for (name, target) in [
            ("été #%.md", "%C3%A9t%C3%A9%20%23%25.md"),
            ("%2e%2e.md", "%252e%252e.md"),
        ] {
            fs::write(directory.path().join("root").join(name), "# Encodé").unwrap();
            let selection = registry
                .authorize_relative(&a.snapshot.session_id, target)
                .unwrap();
            assert_eq!(
                registry
                    .open_first(&selection)
                    .unwrap()
                    .snapshot
                    .display_name,
                name
            );
        }
        assert!(
            registry
                .authorize_relative(&a.snapshot.session_id, "%2e%2e/outside.md")
                .is_err()
        );
    }

    #[test]
    fn root_extension_requires_a_native_ancestor_and_is_revocable() {
        let (directory, registry, a) = relative_fixture();
        fs::write(directory.path().join("outside.md"), "# Parent").unwrap();
        assert!(
            registry
                .authorize_relative(&a.snapshot.session_id, "../outside.md")
                .is_err()
        );
        assert!(
            registry
                .authorize_extended_root("forged", directory.path())
                .is_err()
        );
        assert!(
            registry
                .authorize_extended_root(&a.snapshot.session_id, &directory.path().join("root/sub"))
                .is_err()
        );
        assert!(
            registry
                .authorize_extended_root(&a.snapshot.session_id, Path::new("/"))
                .is_err()
        );
        if let Some(home) = std::env::var_os("HOME") {
            assert!(
                registry
                    .authorize_extended_root(&a.snapshot.session_id, Path::new(&home))
                    .is_err()
            );
        }
        let selection = registry
            .authorize_extended_root(&a.snapshot.session_id, directory.path())
            .unwrap();
        let extended = registry.open_first(&selection).unwrap();
        let parent = registry
            .authorize_relative(&extended.snapshot.session_id, "../outside.md")
            .unwrap();
        assert_eq!(
            registry.open_first(&parent).unwrap().snapshot.text,
            "# Parent"
        );
        let pending = registry
            .authorize_extended_root(&a.snapshot.session_id, directory.path())
            .unwrap();
        registry.release_session(&a.snapshot.session_id);
        assert!(registry.open_first(&pending).is_err());
        assert!(
            registry
                .authorize_extended_root(&a.snapshot.session_id, directory.path())
                .is_err()
        );
    }

    #[test]
    fn relative_navigation_rejects_missing_non_markdown_and_escape() {
        let (directory, registry, a) = relative_fixture();
        fs::write(directory.path().join("root/file.txt"), "texte").unwrap();
        for (target, code) in [
            ("missing.md", AppErrorCode::DocumentNotFound),
            ("file.txt", AppErrorCode::UnsupportedFormat),
            ("../outside.md", AppErrorCode::ResourceOutsideRoot),
        ] {
            let error = registry
                .authorize_relative(&a.snapshot.session_id, target)
                .unwrap_err();
            assert_eq!(format!("{:?}", error.code), format!("{code:?}"));
        }
        assert!(registry.contains_session(&a.snapshot.session_id));
    }

    #[test]
    fn relative_navigation_rejects_absolute_paths_even_inside_root() {
        let (directory, registry, a) = relative_fixture();
        let target = directory.path().join("root/c.md");
        assert!(
            registry
                .authorize_relative(&a.snapshot.session_id, target.to_str().unwrap())
                .is_err()
        );
        for target in ["C:/c.md", "//host/share/c.md", "https://example.test/a.md"] {
            assert!(
                registry
                    .authorize_relative(&a.snapshot.session_id, target)
                    .is_err()
            );
        }
    }

    #[test]
    fn relative_selection_is_revoked_with_its_parent_session() {
        let (_directory, registry, a) = relative_fixture();
        let selection = registry
            .authorize_relative(&a.snapshot.session_id, "c.md")
            .unwrap();
        registry.release_session(&a.snapshot.session_id);
        assert!(registry.open_first(&selection).is_err());
        assert!(
            registry
                .authorize_relative(&a.snapshot.session_id, "c.md")
                .is_err()
        );
        assert!(registry.authorize_relative("forged", "c.md").is_err());
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn relative_navigation_rejects_external_symlinks_and_replaced_root() {
        use std::os::unix::fs::symlink;
        let (directory, registry, a) = relative_fixture();
        symlink(
            directory.path().join("outside.md"),
            directory.path().join("root/link.md"),
        )
        .unwrap();
        assert!(
            registry
                .authorize_relative(&a.snapshot.session_id, "link.md")
                .is_err()
        );
        fs::rename(
            directory.path().join("root"),
            directory.path().join("old-root"),
        )
        .unwrap();
        fs::create_dir(directory.path().join("root")).unwrap();
        fs::write(directory.path().join("root/c.md"), "# remplacé").unwrap();
        assert!(
            registry
                .authorize_relative(&a.snapshot.session_id, "c.md")
                .is_err()
        );
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn relative_open_checks_the_actual_handle_when_an_ancestor_is_substituted() {
        use std::os::unix::fs::symlink;
        let (directory, registry, a) = relative_fixture();
        let selection = registry
            .authorize_relative(&a.snapshot.session_id, "sub/b.md")
            .unwrap();
        // The inode of B is unchanged; its identity alone does not prove confinement.
        fs::rename(
            directory.path().join("root/sub"),
            directory.path().join("outside-sub"),
        )
        .unwrap();
        symlink(
            directory.path().join("outside-sub"),
            directory.path().join("root/sub"),
        )
        .unwrap();
        assert!(matches!(
            registry.open_first(&selection),
            Err(AppError {
                code: AppErrorCode::ResourceOutsideRoot,
                ..
            })
        ));
    }

    #[test]
    fn relative_open_rejects_revocation_during_read() {
        let (_directory, registry, a) = relative_fixture();
        let selection = registry
            .authorize_relative(&a.snapshot.session_id, "c.md")
            .unwrap();
        let result = registry.open_first_with_after_metadata(&selection, || {
            registry.release_session(&a.snapshot.session_id)
        });
        assert!(result.is_err());
    }

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
