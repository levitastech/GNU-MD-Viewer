use crate::contracts::{AppError, AppErrorCode};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs::{self, File, OpenOptions},
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::Mutex,
};
const MAX_BYTES: u64 = 65_536;
const MAX_RECENTS: usize = 20;

#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    #[default]
    System,
    Light,
    Dark,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingPreferences {
    pub theme: Theme,
    pub zoom: u16,
    pub toc_visible: bool,
}
impl Default for ReadingPreferences {
    fn default() -> Self {
        Self {
            theme: Theme::System,
            zoom: 100,
            toc_visible: true,
        }
    }
}
impl ReadingPreferences {
    fn validate(&self) -> Result<(), AppError> {
        if !(80..=200).contains(&self.zoom) || !self.zoom.is_multiple_of(10) {
            return Err(failure("Zoom de préférence invalide."));
        }
        Ok(())
    }
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Envelope {
    version: u32,
    reading: ReadingPreferences,
    recents: Vec<PathBuf>,
}
impl Default for Envelope {
    fn default() -> Self {
        Self {
            version: 1,
            reading: ReadingPreferences::default(),
            recents: vec![],
        }
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Recent {
    id: String,
    label: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreferenceView {
    pub reading: ReadingPreferences,
    recents: Vec<Recent>,
    notice: Option<String>,
    writable: bool,
}
struct StoreState {
    ids: HashMap<String, PathBuf>,
    envelope: Envelope,
    notice: Option<String>,
    writable: bool,
}
pub struct PreferenceStore {
    path: PathBuf,
    state: Mutex<StoreState>,
}
impl PreferenceStore {
    pub fn unavailable() -> Self {
        Self {
            path: PathBuf::new(),
            state: Mutex::new(StoreState {
                ids: HashMap::new(),
                envelope: Envelope::default(),
                notice: Some(
                    "Dossier de configuration indisponible ; réglages de session uniquement."
                        .into(),
                ),
                writable: false,
            }),
        }
    }

    pub fn load(path: PathBuf) -> Self {
        let mut state = StoreState {
            ids: HashMap::new(),
            envelope: Envelope::default(),
            notice: None,
            writable: true,
        };
        match File::open(&path) {
            Ok(file) => {
                let mut bytes = Vec::new();
                if file.take(MAX_BYTES + 1).read_to_end(&mut bytes).is_err()
                    || bytes.len() as u64 > MAX_BYTES
                {
                    state.writable = false;
                    state.notice = Some("Configuration illisible ou trop volumineuse ; valeurs par défaut sans écrasement.".into());
                } else if let Ok(value) = serde_json::from_slice::<serde_json::Value>(&bytes) {
                    if value["version"].as_u64().is_some_and(|version| version > 1) {
                        state.writable = false;
                        state.notice = Some("Configuration d'une version plus récente ; fichier conservé sans écrasement.".into());
                    } else if let Ok(mut envelope) = serde_json::from_value::<Envelope>(value) {
                        if envelope.version == 1 && envelope.reading.validate().is_ok() {
                            envelope.recents.retain(|path| {
                                path.is_absolute() && path.to_string_lossy().len() <= 4096
                            });
                            let mut unique = Vec::new();
                            for path in envelope.recents {
                                if !unique.contains(&path) {
                                    unique.push(path);
                                }
                                if unique.len() == MAX_RECENTS {
                                    break;
                                }
                            }
                            unique.truncate(MAX_RECENTS);
                            envelope.recents = unique;
                            state.envelope = envelope;
                        } else {
                            state.notice =
                                Some("Configuration invalide ; valeurs par défaut.".into());
                        }
                    } else {
                        state.notice = Some("Configuration invalide ; valeurs par défaut.".into());
                    }
                } else {
                    state.notice = Some("Configuration corrompue ; valeurs par défaut.".into());
                }
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(_) => {
                state.writable = false;
                state.notice = Some("Configuration inaccessible ; valeurs par défaut.".into());
            }
        }
        Self {
            path,
            state: Mutex::new(state),
        }
    }

    pub fn view(&self) -> PreferenceView {
        let mut state = self.state.lock().expect("préférences empoisonnées");
        let paths = state.envelope.recents.clone();
        state.ids.retain(|_, path| paths.contains(path));
        let mut recents = Vec::new();
        for path in paths {
            let id = if let Some((id, _)) = state.ids.iter().find(|(_, known)| **known == path) {
                id.clone()
            } else {
                let mut bytes = [0u8; 16];
                if getrandom::fill(&mut bytes).is_err() {
                    continue;
                }
                let id = format!("{:032x}", u128::from_ne_bytes(bytes));
                state.ids.insert(id.clone(), path.clone());
                id
            };
            recents.push(Recent {
                id,
                label: path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .into_owned(),
            });
        }
        PreferenceView {
            reading: state.envelope.reading.clone(),
            recents,
            notice: state.notice.clone(),
            writable: state.writable,
        }
    }
    pub fn save_reading(&self, reading: ReadingPreferences) -> Result<(), AppError> {
        reading.validate()?;
        let mut state = self.state.lock().expect("préférences empoisonnées");
        let mut next = state.envelope.clone();
        next.reading = reading;
        self.persist(&state, &next)?;
        state.envelope = next;
        state.notice = None;
        Ok(())
    }
    pub fn record(&self, path: &Path) {
        let mut state = self.state.lock().expect("préférences empoisonnées");
        if !state.writable || path.to_string_lossy().len() > 4096 {
            return;
        }
        let mut next = state.envelope.clone();
        next.recents.retain(|recent| recent != path);
        next.recents.insert(0, path.to_path_buf());
        next.recents.truncate(MAX_RECENTS);
        while serde_json::to_vec(&next).map_or(true, |bytes| bytes.len() as u64 > MAX_BYTES)
            && !next.recents.is_empty()
        {
            next.recents.pop();
        }
        match self.persist(&state, &next) {
            Ok(()) => {
                state.envelope = next;
            }
            Err(_) => {
                state.notice =
                    Some("Historique non enregistré : configuration inaccessible.".into());
            }
        }
    }

    pub fn recent(&self, id: &str) -> Result<PathBuf, AppError> {
        let state = self.state.lock().expect("préférences empoisonnées");
        state
            .ids
            .get(id)
            .filter(|path| state.envelope.recents.contains(path))
            .cloned()
            .ok_or_else(|| failure("Entrée récente absente."))
    }
    pub fn forget_recent(&self, id: &str) -> Result<(), AppError> {
        let path = self.recent(id)?;
        let mut state = self.state.lock().expect("préférences empoisonnées");
        let mut next = state.envelope.clone();
        next.recents.retain(|recent| recent != &path);
        self.persist(&state, &next)?;
        state.envelope = next;
        state.ids.remove(id);
        state.notice = None;
        Ok(())
    }
    pub fn clear_recents(&self) -> Result<(), AppError> {
        let mut state = self.state.lock().expect("préférences empoisonnées");
        let mut next = state.envelope.clone();
        next.recents.clear();
        self.persist(&state, &next)?;
        state.envelope = next;
        state.notice = None;
        Ok(())
    }
    fn persist(&self, state: &StoreState, next: &Envelope) -> Result<(), AppError> {
        if !state.writable {
            return Err(failure("Configuration conservée en lecture seule."));
        }
        let parent = self
            .path
            .parent()
            .ok_or_else(|| failure("Dossier de configuration absent."))?;
        fs::create_dir_all(parent)
            .map_err(|_| failure("Dossier de configuration inaccessible."))?;
        let mut random = [0u8; 16];
        getrandom::fill(&mut random)
            .map_err(|_| failure("Écriture de configuration indisponible."))?;
        let temporary = parent.join(format!(
            ".preferences-{:x}.tmp",
            u128::from_ne_bytes(random)
        ));
        let result = (|| {
            let bytes = serde_json::to_vec(next).map_err(|_| failure("Préférences invalides."))?;
            if bytes.len() as u64 > MAX_BYTES {
                return Err(failure("Configuration trop volumineuse."));
            }
            let mut options = OpenOptions::new();
            options.write(true).create_new(true);
            #[cfg(unix)]
            {
                use std::os::unix::fs::OpenOptionsExt;
                options.mode(0o600);
            }
            let mut file = options
                .open(&temporary)
                .map_err(|_| failure("Configuration inaccessible."))?;
            file.write_all(&bytes)
                .and_then(|()| file.sync_all())
                .map_err(|_| failure("Écriture de configuration impossible."))?;
            drop(file);
            fs::rename(&temporary, &self.path)
                .map_err(|_| failure("Remplacement de configuration impossible."))?;
            #[cfg(unix)]
            File::open(parent)
                .and_then(|file| file.sync_all())
                .map_err(|_| failure("Synchronisation de configuration impossible."))?;
            Ok(())
        })();
        if result.is_err() {
            let _ = fs::remove_file(temporary);
        }
        result
    }
}
fn failure(message: &str) -> AppError {
    AppError::new(AppErrorCode::AccessDenied, message)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    #[test]
    fn empty_corrupt_future_and_oversized_configs_are_safe() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("preferences.json");
        assert_eq!(PreferenceStore::load(path.clone()).view().reading.zoom, 100);
        fs::write(&path, b"{").unwrap();
        assert!(PreferenceStore::load(path.clone()).view().notice.is_some());
        let future = b"{\"version\":99,\"private\":\"keep\"}";
        fs::write(&path, future).unwrap();
        let store = PreferenceStore::load(path.clone());
        assert!(!store.view().writable);
        assert!(store.clear_recents().is_err());
        assert!(store.save_reading(ReadingPreferences::default()).is_err());
        assert_eq!(fs::read(&path).unwrap(), future);
        fs::write(&path, vec![b'x'; MAX_BYTES as usize + 1]).unwrap();
        assert!(!PreferenceStore::load(path).view().writable);
    }
    #[test]
    fn atomic_roundtrip_bounded_deduplicated_history_and_clear_preserve_documents() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("preferences.json");
        let store = PreferenceStore::load(path.clone());
        let source = dir.path().join("été عربي.md");
        fs::write(&source, "# original").unwrap();
        for index in 0..25 {
            store.record(&dir.path().join(format!("{index}.md")));
        }
        store.record(&source);
        store.record(&source);
        assert_eq!(store.view().recents.len(), MAX_RECENTS);
        assert_eq!(store.recent(&store.view().recents[0].id).unwrap(), source);
        store
            .save_reading(ReadingPreferences {
                theme: Theme::Dark,
                zoom: 150,
                toc_visible: false,
            })
            .unwrap();
        let restored = PreferenceStore::load(path.clone());
        assert_eq!(restored.view().reading.zoom, 150);
        assert!(!restored.view().reading.toc_visible);
        // An interrupted unrelated temporary file must never replace the last complete JSON.
        fs::write(dir.path().join(".preferences-abandoned.tmp"), "partial").unwrap();
        assert_eq!(PreferenceStore::load(path.clone()).view().reading.zoom, 150);
        restored.clear_recents().unwrap();
        assert!(PreferenceStore::load(path).view().recents.is_empty());
        assert_eq!(fs::read_to_string(source).unwrap(), "# original");
    }

    #[test]
    fn opaque_recent_ids_survive_reordering_and_are_revoked_on_removal() {
        let dir = tempdir().unwrap();
        let store = PreferenceStore::load(dir.path().join("prefs.json"));
        let first = dir.path().join("first.md");
        let other = dir.path().join("other.md");
        store.record(&first);
        let id = store.view().recents[0].id.clone();
        store.record(&other);
        store.view();
        assert_eq!(store.recent(&id).unwrap(), first);
        assert!(store.recent("forged").is_err());
        store.forget_recent(&id).unwrap();
        assert!(store.recent(&id).is_err());
        assert_eq!(store.view().recents.len(), 1);
    }

    #[test]
    fn failed_atomic_replacement_keeps_last_good_state_and_no_temp_files() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("preferences.json");
        let store = PreferenceStore::load(path.clone());
        fs::create_dir(&path).unwrap();
        assert!(
            store
                .save_reading(ReadingPreferences {
                    zoom: 120,
                    ..ReadingPreferences::default()
                })
                .is_err()
        );
        assert_eq!(store.view().reading.zoom, 100);
        assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 1);
    }
}
