#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("impossible de lancer GNU-MD Viewer");
}

#[cfg(test)]
mod tests {
    #[test]
    fn package_name_matches_binary_contract() {
        assert_eq!(env!("CARGO_PKG_NAME"), "gnu-mdv");
    }
}
