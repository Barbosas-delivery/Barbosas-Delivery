import { insertWithSchemaRetry } from "./supabaseSchema";

export async function writeAuditLog({ action, entity, entityId, afterJson = {}, beforeJson = null, userType = "system", userName = "sistema" }) {
  return insertWithSchemaRetry("audit_logs", {
    user_type: userType,
    user_name: userName,
    action,
    entity,
    entity_id: entityId ? String(entityId) : "",
    before_json: beforeJson,
    after_json: afterJson,
    created_at: new Date().toISOString(),
  }, false);
}

export async function writeAppError(source, error, metadata = {}) {
  return insertWithSchemaRetry("app_errors", {
    source,
    message: String(error?.message || error || "Erro desconhecido"),
    stack: String(error?.stack || ""),
    metadata,
    created_at: new Date().toISOString(),
  }, false);
}
