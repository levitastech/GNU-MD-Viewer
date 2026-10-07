fn main() {
    let attributes =
        tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new().commands(&[
            "load_preferences",
            "save_preferences",
            "clear_recent_documents",
            "forget_recent_document",
            "select_recent_document",
            "select_document",
            "select_root_extension",
            "open_document",
            "select_relative_document",
            "poll_document",
            "select_document_reload",
            "release_document_session",
            "open_external_url",
            "resolve_resource",
            "release_resource_session",
        ]));

    tauri_build::try_build(attributes).expect("échec de la préparation Tauri");
}
