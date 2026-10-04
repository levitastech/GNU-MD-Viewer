use std::sync::Arc;

use tauri::{State, WebviewWindow};

use crate::{
    contracts::{AppError, AppErrorCode, ResolvedResource, ResourceRequest},
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
}
