use std::{
    collections::HashMap,
    fs::File,
    io::{Read, Seek, SeekFrom},
    path::{Component, Path, PathBuf},
    sync::{Arc, Mutex},
};

use crate::contracts::{AppError, AppErrorCode, ResolvedResource, ResourceKind, ResourceRequest};

pub const RESOURCE_PROTOCOL: &str = "gnu-mdv-resource";
pub const MAX_IMAGE_ENCODED_BYTES: usize = 10_000_000;
pub const MAX_IMAGE_DIMENSION: u32 = 16_384;
pub const MAX_IMAGE_DECODED_RGBA_BYTES: u64 = 64_000_000;
const MAX_SESSION_RESOURCES: usize = 32;
const MAX_SESSION_CACHE_BYTES: usize = 64_000_000;

#[derive(Clone)]
pub struct StoredResource {
    pub bytes: Arc<[u8]>,
    pub mime: &'static str,
    pub width: u32,
    pub height: u32,
}

struct SessionResources {
    document_id: String,
    root: PathBuf,
    root_identity: RootIdentity,
    by_target: HashMap<PathBuf, String>,
    cache_bytes: usize,
}

#[cfg(target_os = "linux")]
#[derive(Clone, Copy, PartialEq, Eq)]
struct RootIdentity {
    device: u64,
    inode: u64,
}

#[cfg(not(target_os = "linux"))]
#[derive(Clone, Copy, PartialEq, Eq)]
struct RootIdentity;

#[derive(Default)]
struct RegistryState {
    sessions: HashMap<String, SessionResources>,
    tokens: HashMap<String, StoredResource>,
}

#[derive(Default)]
pub struct ResourceRegistry {
    state: Mutex<RegistryState>,
}

impl ResourceRegistry {
    pub fn register_document_session(
        &self,
        session_id: impl Into<String>,
        document_id: impl Into<String>,
        document_path: &Path,
    ) -> Result<(), AppError> {
        let document = document_path.canonicalize().map_err(|_| {
            AppError::new(
                AppErrorCode::ResourceNotFound,
                "Le document de la session est absent.",
            )
        })?;
        if !document.is_file() {
            return Err(AppError::new(
                AppErrorCode::ResourceInvalid,
                "Le document de la session n'est pas un fichier régulier.",
            ));
        }
        let root = document.parent().ok_or_else(|| {
            AppError::new(
                AppErrorCode::ResourceInvalid,
                "Le document ne possède pas de dossier parent.",
            )
        })?;
        let root_identity = root_identity(root)?;

        let mut state = self
            .state
            .lock()
            .expect("registre de ressources empoisonné");
        let previous = state.sessions.insert(
            session_id.into(),
            SessionResources {
                document_id: document_id.into(),
                root: root.to_path_buf(),
                root_identity,
                by_target: HashMap::new(),
                cache_bytes: 0,
            },
        );
        if let Some(previous) = previous {
            for token in previous.by_target.values() {
                state.tokens.remove(token);
            }
        }
        Ok(())
    }

    pub fn resolve(&self, request: &ResourceRequest) -> Result<ResolvedResource, AppError> {
        self.resolve_with_after_open(request, || {})
    }

    fn resolve_with_after_open<F>(
        &self,
        request: &ResourceRequest,
        after_open: F,
    ) -> Result<ResolvedResource, AppError>
    where
        F: FnOnce(),
    {
        if request.expected_kind != ResourceKind::Image {
            return Err(AppError::new(
                AppErrorCode::UnsupportedFormat,
                "Seules les images locales sont résolues par ce service.",
            ));
        }

        let target = validate_relative_target(&request.target)?;
        let (root, root_identity, cached_token) = {
            let state = self
                .state
                .lock()
                .expect("registre de ressources empoisonné");
            let session = state.sessions.get(&request.session_id).ok_or_else(|| {
                AppError::new(
                    AppErrorCode::ResourceRevoked,
                    "La session de ressource a été révoquée.",
                )
            })?;

            if session.document_id != request.document_id {
                return Err(AppError::new(
                    AppErrorCode::AccessDenied,
                    "La ressource n'appartient pas au document actif.",
                ));
            }

            (
                session.root.clone(),
                session.root_identity,
                session.by_target.get(&target).cloned(),
            )
        };

        if let Some(token) = cached_token {
            return self.describe(&token);
        }

        let mut file = secure_open(&root, &target)?;
        after_open();
        verify_opened_file_is_confined(&file, &root, root_identity)?;

        let metadata = file.metadata().map_err(|_| {
            AppError::new(
                AppErrorCode::ResourceInvalid,
                "Les métadonnées de l'image sont illisibles.",
            )
        })?;
        if !metadata.is_file() {
            return Err(AppError::new(
                AppErrorCode::ResourceInvalid,
                "La ressource demandée n'est pas un fichier régulier.",
            ));
        }
        if metadata.len() > MAX_IMAGE_ENCODED_BYTES as u64 {
            return Err(image_too_large());
        }

        file.seek(SeekFrom::Start(0)).map_err(read_error)?;
        let mut bytes = Vec::with_capacity(metadata.len() as usize);
        file.take((MAX_IMAGE_ENCODED_BYTES + 1) as u64)
            .read_to_end(&mut bytes)
            .map_err(read_error)?;
        if bytes.len() > MAX_IMAGE_ENCODED_BYTES {
            return Err(image_too_large());
        }

        let image = inspect_image(&bytes)?;
        validate_image_dimensions(image.width, image.height)?;
        let token = random_token()?;
        let stored = StoredResource {
            bytes: Arc::from(bytes),
            mime: image.mime,
            width: image.width,
            height: image.height,
        };

        let mut state = self
            .state
            .lock()
            .expect("registre de ressources empoisonné");
        let session = state.sessions.get_mut(&request.session_id).ok_or_else(|| {
            AppError::new(
                AppErrorCode::ResourceRevoked,
                "La session de ressource a été révoquée.",
            )
        })?;
        if session.document_id != request.document_id || session.root_identity != root_identity {
            return Err(AppError::new(
                AppErrorCode::ResourceRevoked,
                "La session de ressource a changé pendant la lecture.",
            ));
        }
        if session.by_target.len() >= MAX_SESSION_RESOURCES
            || session.cache_bytes.saturating_add(stored.bytes.len()) > MAX_SESSION_CACHE_BYTES
        {
            return Err(AppError::new(
                AppErrorCode::ResourceTooLarge,
                "Le cache d'images de la session est saturé.",
            ));
        }

        session.cache_bytes += stored.bytes.len();
        session.by_target.insert(target, token.clone());
        state.tokens.insert(token.clone(), stored);
        self.describe_locked(&state, &token)
    }

    pub fn get(&self, token: &str) -> Option<StoredResource> {
        self.state
            .lock()
            .expect("registre de ressources empoisonné")
            .tokens
            .get(token)
            .cloned()
    }

    pub fn release_session(&self, session_id: &str) {
        let mut state = self
            .state
            .lock()
            .expect("registre de ressources empoisonné");
        if let Some(session) = state.sessions.remove(session_id) {
            for token in session.by_target.values() {
                state.tokens.remove(token);
            }
        }
    }

    fn describe(&self, token: &str) -> Result<ResolvedResource, AppError> {
        let state = self
            .state
            .lock()
            .expect("registre de ressources empoisonné");
        self.describe_locked(&state, token)
    }

    fn describe_locked(
        &self,
        state: &RegistryState,
        token: &str,
    ) -> Result<ResolvedResource, AppError> {
        let stored = state.tokens.get(token).ok_or_else(|| {
            AppError::new(
                AppErrorCode::ResourceRevoked,
                "La ressource a été révoquée.",
            )
        })?;
        Ok(ResolvedResource {
            token: token.to_owned(),
            mime: stored.mime,
            encoded_bytes: stored.bytes.len(),
            width: stored.width,
            height: stored.height,
        })
    }
}

fn validate_relative_target(target: &str) -> Result<PathBuf, AppError> {
    if target.is_empty()
        || target.contains('\0')
        || target.contains('%')
        || target.contains('?')
        || target.contains('#')
        || target.contains('\\')
    {
        return Err(AppError::new(
            AppErrorCode::ResourceInvalid,
            "La référence locale est vide ou ambiguë.",
        ));
    }

    let path = Path::new(target);
    if path.is_absolute()
        || path
            .components()
            .any(|component| matches!(component, Component::Prefix(_) | Component::RootDir))
    {
        return Err(AppError::new(
            AppErrorCode::ResourceOutsideRoot,
            "Les chemins absolus ne sont pas autorisés pour une ressource.",
        ));
    }
    Ok(path.to_path_buf())
}

fn secure_open(root: &Path, target: &Path) -> Result<File, AppError> {
    #[cfg(target_os = "linux")]
    {
        File::open(root.join(target)).map_err(|_| {
            AppError::new(
                AppErrorCode::ResourceNotFound,
                "L'image locale est absente ou illisible.",
            )
        })
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = (root, target);
        Err(AppError::new(
            AppErrorCode::UnsupportedPlatform,
            "L'ouverture résistante aux substitutions reste à qualifier sur cette plateforme.",
        ))
    }
}

#[cfg(target_os = "linux")]
fn root_identity(root: &Path) -> Result<RootIdentity, AppError> {
    use std::os::unix::fs::MetadataExt;

    let metadata = root.metadata().map_err(|_| {
        AppError::new(
            AppErrorCode::ResourceInvalid,
            "Le dossier racine ne peut pas être vérifié.",
        )
    })?;
    Ok(RootIdentity {
        device: metadata.dev(),
        inode: metadata.ino(),
    })
}

#[cfg(not(target_os = "linux"))]
fn root_identity(_root: &Path) -> Result<RootIdentity, AppError> {
    Ok(RootIdentity)
}

#[cfg(target_os = "linux")]
fn verify_opened_file_is_confined(
    file: &File,
    root: &Path,
    expected_root: RootIdentity,
) -> Result<(), AppError> {
    use std::os::fd::AsRawFd;

    if root_identity(root)? != expected_root {
        return Err(AppError::new(
            AppErrorCode::ResourceOutsideRoot,
            "Le dossier autorisé a été remplacé.",
        ));
    }

    let opened_path =
        std::fs::read_link(format!("/proc/self/fd/{}", file.as_raw_fd())).map_err(|_| {
            AppError::new(
                AppErrorCode::ResourceInvalid,
                "Le chemin du fichier effectivement ouvert ne peut pas être vérifié.",
            )
        })?;

    if opened_path.starts_with(root) {
        Ok(())
    } else {
        Err(AppError::new(
            AppErrorCode::ResourceOutsideRoot,
            "Accès hors du dossier autorisé.",
        ))
    }
}

#[cfg(not(target_os = "linux"))]
fn verify_opened_file_is_confined(
    _file: &File,
    _root: &Path,
    _expected_root: RootIdentity,
) -> Result<(), AppError> {
    Err(AppError::new(
        AppErrorCode::UnsupportedPlatform,
        "Le confinement effectif reste à qualifier sur cette plateforme.",
    ))
}

fn random_token() -> Result<String, AppError> {
    let mut bytes = [0_u8; 32];
    getrandom::fill(&mut bytes).map_err(|_| {
        AppError::new(
            AppErrorCode::ResourceInvalid,
            "Impossible de créer un jeton de ressource sûr.",
        )
    })?;
    Ok(bytes.iter().map(|byte| format!("{byte:02x}")).collect())
}

fn read_error(_error: std::io::Error) -> AppError {
    AppError::new(
        AppErrorCode::ResourceInvalid,
        "La lecture de l'image locale a échoué.",
    )
}

fn image_too_large() -> AppError {
    AppError::new(
        AppErrorCode::ResourceTooLarge,
        "L'image locale dépasse la limite autorisée.",
    )
}

struct ImageMetadata {
    mime: &'static str,
    width: u32,
    height: u32,
}

fn inspect_image(bytes: &[u8]) -> Result<ImageMetadata, AppError> {
    inspect_png(bytes)
        .or_else(|| inspect_gif(bytes))
        .or_else(|| inspect_jpeg(bytes))
        .or_else(|| inspect_webp(bytes))
        .ok_or_else(|| {
            AppError::new(
                AppErrorCode::UnsupportedFormat,
                "Le format ou la signature de l'image n'est pas pris en charge.",
            )
        })
}

fn inspect_png(bytes: &[u8]) -> Option<ImageMetadata> {
    if bytes.len() < 24 || &bytes[..8] != b"\x89PNG\r\n\x1a\n" || &bytes[12..16] != b"IHDR" {
        return None;
    }
    Some(ImageMetadata {
        mime: "image/png",
        width: u32::from_be_bytes(bytes[16..20].try_into().ok()?),
        height: u32::from_be_bytes(bytes[20..24].try_into().ok()?),
    })
}

fn inspect_gif(bytes: &[u8]) -> Option<ImageMetadata> {
    if bytes.len() < 10 || !matches!(&bytes[..6], b"GIF87a" | b"GIF89a") {
        return None;
    }
    Some(ImageMetadata {
        mime: "image/gif",
        width: u16::from_le_bytes(bytes[6..8].try_into().ok()?) as u32,
        height: u16::from_le_bytes(bytes[8..10].try_into().ok()?) as u32,
    })
}

fn inspect_jpeg(bytes: &[u8]) -> Option<ImageMetadata> {
    if bytes.len() < 4 || bytes[..2] != [0xff, 0xd8] {
        return None;
    }

    let mut offset = 2;
    while offset + 4 <= bytes.len() {
        if bytes[offset] != 0xff {
            offset += 1;
            continue;
        }
        while offset < bytes.len() && bytes[offset] == 0xff {
            offset += 1;
        }
        let marker = *bytes.get(offset)?;
        offset += 1;
        if matches!(marker, 0xd8 | 0xd9) {
            continue;
        }
        if marker == 0xda {
            break;
        }
        let length = u16::from_be_bytes(bytes.get(offset..offset + 2)?.try_into().ok()?) as usize;
        if length < 2 || offset + length > bytes.len() {
            return None;
        }
        if matches!(
            marker,
            0xc0 | 0xc1
                | 0xc2
                | 0xc3
                | 0xc5
                | 0xc6
                | 0xc7
                | 0xc9
                | 0xca
                | 0xcb
                | 0xcd
                | 0xce
                | 0xcf
        ) && length >= 7
        {
            return Some(ImageMetadata {
                mime: "image/jpeg",
                height: u16::from_be_bytes(bytes[offset + 3..offset + 5].try_into().ok()?) as u32,
                width: u16::from_be_bytes(bytes[offset + 5..offset + 7].try_into().ok()?) as u32,
            });
        }
        offset += length;
    }
    None
}

fn inspect_webp(bytes: &[u8]) -> Option<ImageMetadata> {
    if bytes.len() < 30 || &bytes[..4] != b"RIFF" || &bytes[8..12] != b"WEBP" {
        return None;
    }

    let (width, height) = match &bytes[12..16] {
        b"VP8X" => (
            read_u24_le(&bytes[24..27])? + 1,
            read_u24_le(&bytes[27..30])? + 1,
        ),
        b"VP8 " if bytes.len() >= 30 && bytes[23..26] == [0x9d, 0x01, 0x2a] => (
            u16::from_le_bytes(bytes[26..28].try_into().ok()?) as u32 & 0x3fff,
            u16::from_le_bytes(bytes[28..30].try_into().ok()?) as u32 & 0x3fff,
        ),
        b"VP8L" if bytes.len() >= 25 && bytes[20] == 0x2f => {
            let bits = u32::from_le_bytes(bytes[21..25].try_into().ok()?);
            ((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1)
        }
        _ => return None,
    };
    Some(ImageMetadata {
        mime: "image/webp",
        width,
        height,
    })
}

fn read_u24_le(bytes: &[u8]) -> Option<u32> {
    Some(*bytes.first()? as u32 | ((*bytes.get(1)? as u32) << 8) | ((*bytes.get(2)? as u32) << 16))
}

fn validate_image_dimensions(width: u32, height: u32) -> Result<(), AppError> {
    let decoded_bytes = u64::from(width)
        .saturating_mul(u64::from(height))
        .saturating_mul(4);
    if width == 0
        || height == 0
        || width > MAX_IMAGE_DIMENSION
        || height > MAX_IMAGE_DIMENSION
        || decoded_bytes > MAX_IMAGE_DECODED_RGBA_BYTES
    {
        return Err(image_too_large());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::{fs, os::unix::fs::symlink};

    use tempfile::tempdir;

    use super::*;

    fn png(width: u32, height: u32, marker: u8) -> Vec<u8> {
        let mut bytes = b"\x89PNG\r\n\x1a\n\0\0\0\rIHDR".to_vec();
        bytes.extend_from_slice(&width.to_be_bytes());
        bytes.extend_from_slice(&height.to_be_bytes());
        bytes.extend_from_slice(&[8, 6, 0, 0, 0, marker]);
        bytes
    }

    fn request(target: &str) -> ResourceRequest {
        ResourceRequest {
            session_id: "session-a".into(),
            document_id: "document-a".into(),
            target: target.into(),
            expected_kind: ResourceKind::Image,
        }
    }

    fn fixture() -> (tempfile::TempDir, ResourceRegistry) {
        let directory = tempdir().unwrap();
        fs::create_dir_all(directory.path().join("root/assets")).unwrap();
        fs::write(directory.path().join("root/document.md"), "# document").unwrap();
        let registry = ResourceRegistry::default();
        registry
            .register_document_session(
                "session-a",
                "document-a",
                &directory.path().join("root/document.md"),
            )
            .unwrap();
        (directory, registry)
    }

    #[test]
    fn serves_an_allowed_image_then_revokes_its_token() {
        let (directory, registry) = fixture();
        let image = png(16, 12, 7);
        fs::write(directory.path().join("root/assets/image.png"), &image).unwrap();

        let resolved = registry.resolve(&request("assets/image.png")).unwrap();
        assert_eq!(resolved.mime, "image/png");
        assert_eq!((resolved.width, resolved.height), (16, 12));
        assert_eq!(&*registry.get(&resolved.token).unwrap().bytes, &image);

        registry.release_session("session-a");
        assert!(registry.get(&resolved.token).is_none());
        assert!(matches!(
            registry.resolve(&request("assets/image.png")),
            Err(AppError {
                code: AppErrorCode::ResourceRevoked,
                ..
            })
        ));
    }

    #[test]
    fn rejects_a_symlink_whose_opened_target_is_outside_the_root() {
        let (directory, registry) = fixture();
        fs::create_dir(directory.path().join("outside")).unwrap();
        fs::write(directory.path().join("outside/secret.png"), png(1, 1, 9)).unwrap();
        symlink(
            directory.path().join("outside/secret.png"),
            directory.path().join("root/assets/link.png"),
        )
        .unwrap();

        assert!(matches!(
            registry.resolve(&request("assets/link.png")),
            Err(AppError {
                code: AppErrorCode::ResourceOutsideRoot,
                ..
            })
        ));
    }

    #[test]
    fn reads_the_opened_handle_when_the_symlink_is_substituted() {
        let (directory, registry) = fixture();
        let internal = png(2, 2, 1);
        let external = png(3, 3, 2);
        fs::create_dir(directory.path().join("outside")).unwrap();
        fs::write(directory.path().join("root/assets/internal.png"), &internal).unwrap();
        fs::write(directory.path().join("outside/external.png"), &external).unwrap();
        let link = directory.path().join("root/assets/current.png");
        symlink(directory.path().join("root/assets/internal.png"), &link).unwrap();

        let resolved = registry
            .resolve_with_after_open(&request("assets/current.png"), || {
                fs::remove_file(&link).unwrap();
                symlink(directory.path().join("outside/external.png"), &link).unwrap();
            })
            .unwrap();

        assert_eq!((resolved.width, resolved.height), (2, 2));
        assert_eq!(&*registry.get(&resolved.token).unwrap().bytes, &internal);
    }

    #[test]
    fn rejects_a_replacement_directory_at_the_authorized_root_path() {
        let (directory, registry) = fixture();
        let original_root = directory.path().join("original-root");
        fs::rename(directory.path().join("root"), &original_root).unwrap();
        fs::create_dir_all(directory.path().join("root/assets")).unwrap();
        fs::write(
            directory.path().join("root/assets/replacement.png"),
            png(2, 2, 3),
        )
        .unwrap();

        assert!(matches!(
            registry.resolve(&request("assets/replacement.png")),
            Err(AppError {
                code: AppErrorCode::ResourceOutsideRoot,
                ..
            })
        ));
    }

    #[test]
    fn registering_the_same_session_id_revokes_its_previous_tokens() {
        let (directory, registry) = fixture();
        fs::write(directory.path().join("root/assets/first.png"), png(2, 2, 4)).unwrap();
        let first = registry.resolve(&request("assets/first.png")).unwrap();

        fs::create_dir_all(directory.path().join("other")).unwrap();
        fs::write(directory.path().join("other/document.md"), "# other").unwrap();
        registry
            .register_document_session(
                "session-a",
                "document-b",
                &directory.path().join("other/document.md"),
            )
            .unwrap();

        assert!(registry.get(&first.token).is_none());
    }

    #[test]
    fn rejects_a_resource_if_its_session_is_replaced_during_the_read() {
        let (directory, registry) = fixture();
        fs::write(
            directory.path().join("root/assets/candidate.png"),
            png(2, 2, 5),
        )
        .unwrap();
        fs::create_dir_all(directory.path().join("other")).unwrap();
        fs::write(directory.path().join("other/document.md"), "# other").unwrap();

        let result = registry.resolve_with_after_open(&request("assets/candidate.png"), || {
            registry
                .register_document_session(
                    "session-a",
                    "document-b",
                    &directory.path().join("other/document.md"),
                )
                .unwrap();
        });

        assert!(matches!(
            result,
            Err(AppError {
                code: AppErrorCode::ResourceRevoked,
                ..
            })
        ));
    }

    #[test]
    fn rejects_dimensions_beyond_the_decoded_budget() {
        let (directory, registry) = fixture();
        fs::write(
            directory.path().join("root/assets/bomb.png"),
            png(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, 0),
        )
        .unwrap();

        assert!(matches!(
            registry.resolve(&request("assets/bomb.png")),
            Err(AppError {
                code: AppErrorCode::ResourceTooLarge,
                ..
            })
        ));
    }

    #[test]
    fn accepts_the_decoded_pixel_boundary_and_rejects_boundary_plus_one_row() {
        let (directory, registry) = fixture();
        fs::write(
            directory.path().join("root/assets/boundary.png"),
            png(4_000, 4_000, 0),
        )
        .unwrap();
        fs::write(
            directory.path().join("root/assets/over.png"),
            png(4_000, 4_001, 0),
        )
        .unwrap();

        assert!(registry.resolve(&request("assets/boundary.png")).is_ok());
        assert!(matches!(
            registry.resolve(&request("assets/over.png")),
            Err(AppError {
                code: AppErrorCode::ResourceTooLarge,
                ..
            })
        ));
    }

    #[test]
    fn recognizes_the_four_allowed_raster_headers() {
        assert_eq!(inspect_image(&png(4, 5, 0)).unwrap().mime, "image/png");
        assert_eq!(
            inspect_image(b"GIF89a\x04\0\x05\0").unwrap().mime,
            "image/gif"
        );

        let jpeg = [
            0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x05, 0x00, 0x04, 0x01, 0x01, 0x11,
            0x00, 0xff, 0xd9,
        ];
        assert_eq!(inspect_image(&jpeg).unwrap().mime, "image/jpeg");

        let mut webp = b"RIFF\0\0\0\0WEBPVP8X\0\0\0\0\0\0\0\0".to_vec();
        webp.extend_from_slice(&[3, 0, 0, 4, 0, 0]);
        let metadata = inspect_image(&webp).unwrap();
        assert_eq!(
            (metadata.mime, metadata.width, metadata.height),
            ("image/webp", 4, 5)
        );
    }
}
