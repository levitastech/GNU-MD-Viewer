use std::sync::Arc;

use tauri::{AppHandle, State, WebviewWindow};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;
use url::Url;

use crate::{
    config::{PreferenceStore, PreferenceView, ReadingPreferences},
    contracts::{AppError, AppErrorCode, ResolvedResource, ResourceRequest},
    documents::{DocumentRegistry, DocumentSelection, DocumentSnapshot},
    resources::ResourceRegistry,
};

fn require_main_webview(webview: &WebviewWindow) -> Result<(), AppError> {
    if webview.label() == "main" {
        Ok(())
    } else {
        Err(AppError::new(
            AppErrorCode::AccessDenied,
            "Cette commande est réservée à la fenêtre principale locale.",
        ))
    }
}

#[tauri::command]
pub async fn select_document(
    app: AppHandle,
    webview: WebviewWindow,
    documents: State<'_, Arc<DocumentRegistry>>,
) -> Result<Option<DocumentSelection>, AppError> {
    require_main_webview(&webview)?;

    #[cfg(feature = "l09-harness")]
    if let Some(path) = std::env::var_os("GNU_MDV_L09_HARNESS_DOCUMENT") {
        return documents
            .authorize_path(std::path::Path::new(&path))
            .map(Some);
    }

    let selected = tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .add_filter("Markdown", &["md", "markdown", "mdown", "mkd"])
            .blocking_pick_file()
    })
    .await
    .map_err(|_| {
        AppError::new(
            AppErrorCode::AccessDenied,
            "Le dialogue de sélection n'a pas pu être ouvert.",
        )
    })?;

    let Some(selected) = selected else {
        return Ok(None);
    };
    let path = selected.into_path().map_err(|_| {
        AppError::new(
            AppErrorCode::UnsupportedFormat,
            "La sélection ne correspond pas à un chemin local pris en charge.",
        )
    })?;
    documents.authorize_path(&path).map(Some)
}

#[tauri::command]
pub async fn select_root_extension(
    app: AppHandle,
    webview: WebviewWindow,
    documents: State<'_, Arc<DocumentRegistry>>,
    session_id: String,
) -> Result<Option<DocumentSelection>, AppError> {
    require_main_webview(&webview)?;
    #[cfg(feature = "l09-harness")]
    if let Some(path) = std::env::var_os("GNU_MDV_V3_HARNESS_ROOT") {
        return documents
            .authorize_extended_root(&session_id, std::path::Path::new(&path))
            .map(Some);
    }
    let selected = tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_title("Autoriser un dossier parent ou projet pour ce document")
            .blocking_pick_folder()
    })
    .await
    .map_err(|_| {
        AppError::new(
            AppErrorCode::AccessDenied,
            "Dialogue de dossier indisponible.",
        )
    })?;
    let Some(selected) = selected else {
        return Ok(None);
    };
    let path = selected
        .into_path()
        .map_err(|_| AppError::new(AppErrorCode::AccessDenied, "Choisir un dossier local."))?;
    documents
        .authorize_extended_root(&session_id, &path)
        .map(Some)
}

#[tauri::command]
pub fn open_document(
    webview: WebviewWindow,
    documents: State<'_, Arc<DocumentRegistry>>,
    resources: State<'_, Arc<ResourceRegistry>>,
    preferences: State<'_, PreferenceStore>,
    selection: DocumentSelection,
) -> Result<DocumentSnapshot, AppError> {
    require_main_webview(&webview)?;
    let opened = documents.open_first(&selection)?;
    if let Err(error) = resources.register_confined_session(
        &opened.snapshot.session_id,
        &opened.snapshot.document_id,
        &opened.path,
        &opened.root,
        opened.root_identity,
    ) {
        documents.release_session(&opened.snapshot.session_id);
        return Err(error);
    }
    if opened.record_recent {
        preferences.record(&opened.path);
    }
    Ok(opened.snapshot)
}

#[tauri::command]
pub fn select_relative_document(
    webview: WebviewWindow,
    documents: State<'_, Arc<DocumentRegistry>>,
    session_id: String,
    target: String,
) -> Result<DocumentSelection, AppError> {
    require_main_webview(&webview)?;
    documents.authorize_relative(&session_id, &target)
}

#[tauri::command]
pub fn poll_document(
    webview: WebviewWindow,
    documents: State<'_, Arc<DocumentRegistry>>,
    session_id: String,
) -> Result<bool, AppError> {
    require_main_webview(&webview)?;
    documents.poll_document(&session_id)
}

#[tauri::command]
pub fn select_document_reload(
    webview: WebviewWindow,
    documents: State<'_, Arc<DocumentRegistry>>,
    session_id: String,
) -> Result<DocumentSelection, AppError> {
    require_main_webview(&webview)?;
    documents.authorize_reload(&session_id)
}

#[tauri::command]
pub fn release_document_session(
    webview: WebviewWindow,
    documents: State<'_, Arc<DocumentRegistry>>,
    session_id: String,
) -> Result<(), AppError> {
    require_main_webview(&webview)?;
    documents.release_session(&session_id);
    Ok(())
}

#[tauri::command]
pub fn open_external_url(
    app: AppHandle,
    webview: WebviewWindow,
    target: String,
) -> Result<(), AppError> {
    require_main_webview(&webview)?;
    let url = Url::parse(&target).map_err(|_| {
        AppError::new(
            AppErrorCode::UnsupportedFormat,
            "Le lien externe est invalide.",
        )
    })?;
    if !matches!(url.scheme(), "http" | "https")
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err(AppError::new(
            AppErrorCode::AccessDenied,
            "Seuls les liens HTTP(S) sans identifiants peuvent être ouverts.",
        ));
    }

    app.opener()
        .open_url(url.as_str(), None::<&str>)
        .map_err(|_| {
            AppError::new(
                AppErrorCode::AccessDenied,
                "Le navigateur système n'a pas pu ouvrir ce lien.",
            )
        })
}

#[tauri::command]
pub fn resolve_resource(
    webview: WebviewWindow,
    registry: State<'_, Arc<ResourceRegistry>>,
    request: ResourceRequest,
) -> Result<ResolvedResource, AppError> {
    require_main_webview(&webview)?;
    registry.resolve(&request)
}

#[tauri::command]
pub fn release_resource_session(
    webview: WebviewWindow,
    registry: State<'_, Arc<ResourceRegistry>>,
    session_id: String,
) -> Result<(), AppError> {
    require_main_webview(&webview)?;
    registry.release_session(&session_id);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_codes_stay_serializable_for_ipc() {
        let error = AppError::new(AppErrorCode::AccessDenied, "refus");
        let debug = format!("{error:?}");
        assert!(debug.contains("AccessDenied"));
    }

    #[test]
    fn external_url_policy_accepts_only_http_without_credentials() {
        for allowed in ["https://example.test/a", "http://localhost:8080/"] {
            let url = Url::parse(allowed).unwrap();
            assert!(matches!(url.scheme(), "http" | "https"));
            assert!(url.username().is_empty());
            assert!(url.password().is_none());
        }
        for denied in [
            "javascript:alert(1)",
            "file:///tmp/secret.md",
            "https://user:secret@example.test/",
        ] {
            let url = Url::parse(denied).unwrap();
            assert!(
                !matches!(url.scheme(), "http" | "https")
                    || !url.username().is_empty()
                    || url.password().is_some()
            );
        }
    }
}

#[tauri::command]
pub fn load_preferences(
    webview: WebviewWindow,
    preferences: State<'_, PreferenceStore>,
) -> Result<PreferenceView, AppError> {
    require_main_webview(&webview)?;
    Ok(preferences.view())
}
#[tauri::command]
pub fn save_preferences(
    webview: WebviewWindow,
    preferences: State<'_, PreferenceStore>,
    reading: ReadingPreferences,
) -> Result<(), AppError> {
    require_main_webview(&webview)?;
    preferences.save_reading(reading)
}
#[tauri::command]
pub fn clear_recent_documents(
    webview: WebviewWindow,
    preferences: State<'_, PreferenceStore>,
) -> Result<(), AppError> {
    require_main_webview(&webview)?;
    preferences.clear_recents()
}
#[tauri::command]
pub fn forget_recent_document(
    webview: WebviewWindow,
    preferences: State<'_, PreferenceStore>,
    id: String,
) -> Result<(), AppError> {
    require_main_webview(&webview)?;
    preferences.forget_recent(&id)
}
#[tauri::command]
pub fn select_recent_document(
    webview: WebviewWindow,
    preferences: State<'_, PreferenceStore>,
    documents: State<'_, Arc<DocumentRegistry>>,
    id: String,
) -> Result<DocumentSelection, AppError> {
    require_main_webview(&webview)?;
    documents.authorize_path(&preferences.recent(&id)?)
}
