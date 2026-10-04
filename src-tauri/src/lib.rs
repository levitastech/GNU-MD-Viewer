mod commands;
pub mod contracts;
pub mod resources;

use std::sync::Arc;

use resources::{RESOURCE_PROTOCOL, ResourceRegistry};
use tauri::http::{Method, Response, StatusCode, header};

fn protocol_response(
    registry: &ResourceRegistry,
    webview_label: &str,
    request: tauri::http::Request<Vec<u8>>,
) -> Response<Vec<u8>> {
    if webview_label != "main" || request.method() != Method::GET || request.uri().query().is_some()
    {
        return Response::builder()
            .status(StatusCode::FORBIDDEN)
            .body(Vec::new())
            .expect("réponse de refus valide");
    }

    let token = request.uri().path().trim_start_matches('/');
    #[cfg(feature = "l04-harness")]
    if token.starts_with("harness-report-") {
        eprintln!("L04_WEBVIEW_REPORT:{token}");
        return Response::builder()
            .status(StatusCode::NO_CONTENT)
            .header(header::CACHE_CONTROL, "no-store")
            .body(Vec::new())
            .expect("réponse de rapport harness valide");
    }

    if token.len() != 64 || !token.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(Vec::new())
            .expect("réponse d'absence valide");
    }

    let Some(resource) = registry.get(token) else {
        #[cfg(feature = "l04-harness")]
        eprintln!("L04_RESOURCE_REVOKED_OR_UNKNOWN");
        return Response::builder()
            .status(StatusCode::NOT_FOUND)
            .header(header::CACHE_CONTROL, "no-store")
            .body(Vec::new())
            .expect("réponse de révocation valide");
    };

    #[cfg(feature = "l04-harness")]
    eprintln!("L04_RESOURCE_ALLOWED");

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, resource.mime)
        .header(header::CACHE_CONTROL, "no-store")
        .header("x-content-type-options", "nosniff")
        .body(resource.bytes.to_vec())
        .expect("réponse de ressource valide")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let registry = Arc::new(ResourceRegistry::default());

    #[cfg(feature = "l04-harness")]
    if let Some(document) = std::env::var_os("GNU_MDV_L04_HARNESS_DOCUMENT") {
        registry
            .register_document_session(
                "l04-harness-session",
                "l04-harness-document",
                std::path::Path::new(&document),
            )
            .expect("fixture native L04 invalide");
    }

    let protocol_registry = Arc::clone(&registry);

    tauri::Builder::default()
        .manage(registry)
        .register_uri_scheme_protocol(RESOURCE_PROTOCOL, move |context, request| {
            protocol_response(&protocol_registry, context.webview_label(), request)
        })
        .invoke_handler(tauri::generate_handler![
            commands::resolve_resource,
            commands::release_resource_session
        ])
        .run(tauri::generate_context!())
        .expect("impossible de lancer GNU-MD Viewer");
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use crate::{protocol_response, resources::ResourceRegistry};
    use tauri::http::{Request, StatusCode};

    #[test]
    fn package_name_matches_binary_contract() {
        assert_eq!(env!("CARGO_PKG_NAME"), "gnu-mdv");
    }

    #[test]
    fn custom_protocol_rejects_unknown_tokens_and_other_webviews() {
        let registry = Arc::new(ResourceRegistry::default());
        let unknown = Request::builder()
            .uri("gnu-mdv-resource://localhost/not-a-token")
            .body(Vec::new())
            .unwrap();
        assert_eq!(
            protocol_response(&registry, "main", unknown).status(),
            StatusCode::NOT_FOUND
        );

        let forged = Request::builder()
            .uri(format!("gnu-mdv-resource://localhost/{}", "a".repeat(64)))
            .body(Vec::new())
            .unwrap();
        assert_eq!(
            protocol_response(&registry, "secondary", forged).status(),
            StatusCode::FORBIDDEN
        );
    }
}
