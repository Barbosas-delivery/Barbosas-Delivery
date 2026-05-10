import { insertWithSchemaRetry } from "./supabaseSchema";
import { supabase } from "../supabaseClient";

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


export function mapAuditLogFromDatabase(row) {
  return {
    id: row.id,
    userType: row.user_type || row.userType || "system",
    userName: row.user_name || row.userName || "sistema",
    action: row.action || "",
    entity: row.entity || "",
    entityId: row.entity_id || row.entityId || "",
    beforeJson: row.before_json || row.beforeJson || null,
    afterJson: row.after_json || row.afterJson || {},
    createdAt: row.created_at || row.createdAt || "",
  };
}

export async function loadAuditLogsFromSupabase(limit = 300) {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return {
    logs: error ? [] : (Array.isArray(data) ? data : []).map(mapAuditLogFromDatabase),
    error,
  };
}
