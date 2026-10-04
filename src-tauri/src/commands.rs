use std::sync::Arc;

use tauri::{AppHandle, State, WebviewWindow};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;
use url::Url;

use crate::{
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
pub fn open_document(
    webview: WebviewWindow,
    documents: State<'_, Arc<DocumentRegistry>>,
    resources: State<'_, Arc<ResourceRegistry>>,
    selection: DocumentSelection,
) -> Result<DocumentSnapshot, AppError> {
    require_main_webview(&webview)?;
    let opened = documents.open_first(&selection)?;
    if let Err(error) = resources.register_document_session(
        &opened.snapshot.session_id,
        &opened.snapshot.document_id,
        &opened.path,
    ) {
        documents.release_session(&opened.snapshot.session_id);
        return Err(error);
    }
    Ok(opened.snapshot)
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
