import { supabase } from "../supabaseClient";
import { normalizeNotificationAudience } from "../utils/notifications";
import { insertWithSchemaRetry } from "./supabaseSchema";

export function mapNotificationFromDatabase(row) {
  return {
    id: row.id,
    type: row.type || "info",
    title: row.title || "Notificação",
    message: row.message || "",
    audience: normalizeNotificationAudience(row.audience || "loja"),
    deliveryId: row.order_id || row.deliveryId || null,
    orderId: row.order_id || row.deliveryId || null,
    courierUsername: row.courier_username || "",
    customerPhone: row.customer_phone || "",
    read: row.read === true,
    readAt: row.read_at || null,
    resolvedAt: row.resolved_at || null,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export async function loadNotificationsFromSupabase() {
  const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(80);
  if (error) return { data: [], error };
  return { data: Array.isArray(data) ? data.map(mapNotificationFromDatabase) : [], error: null };
}

export async function saveNotificationToSupabaseService(notification) {
  const payload = {
    audience: normalizeNotificationAudience(notification.audience),
    courier_username: notification.courierUsername || null,
    customer_phone: notification.customerPhone || null,
    type: notification.type || "info",
    title: notification.title || "Notificação",
    message: notification.message || "",
    order_id: notification.orderId || notification.deliveryId || null,
    read: notification.read === true,
    read_at: notification.readAt || null,
    resolved_at: notification.resolvedAt || null,
    created_at: notification.createdAt || new Date().toISOString(),
  };

  return insertWithSchemaRetry("notifications", payload, false);
}
