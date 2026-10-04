fn main() {
    let attributes = tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&["resolve_resource", "release_resource_session"]),
    );

    tauri_build::try_build(attributes).expect("échec de la préparation Tauri");
}
