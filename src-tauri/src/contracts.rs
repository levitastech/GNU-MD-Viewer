use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AppErrorCode {
    AccessDenied,
    DocumentNotFound,
    DocumentTooLarge,
    InvalidUtf8,
    ResourceInvalid,
    ResourceNotFound,
    ResourceOutsideRoot,
    ResourceRevoked,
    ResourceTooLarge,
    UnsupportedFormat,
    #[cfg_attr(target_os = "linux", allow(dead_code))]
    UnsupportedPlatform,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub code: AppErrorCode,
    pub message: String,
}

impl AppError {
    pub fn new(code: AppErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceRequest {
    pub session_id: String,
    pub document_id: String,
    pub target: String,
    pub expected_kind: ResourceKind,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ResourceKind {
    Image,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedResource {
    pub token: String,
    pub mime: &'static str,
    pub encoded_bytes: usize,
    pub width: u32,
    pub height: u32,
}
