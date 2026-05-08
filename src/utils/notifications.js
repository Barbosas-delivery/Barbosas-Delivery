export function normalizeNotificationAudience(audience) {
  const value = String(audience || "loja").trim().toLowerCase();
  if (value === "couriers" || value === "entregadores") return "courier";
  if (value === "owner" || value === "store" || value === "loja") return "loja";
  return value || "loja";
}

export function createNotification(type, title, message, audience = "loja", deliveryId = null) {
  return {
    id: Date.now() + Math.random(),
    type,
    title,
    message,
    audience: normalizeNotificationAudience(audience),
    deliveryId,
    orderId: deliveryId,
    read: false,
    createdAt: new Date().toISOString(),
  };
}

export function getUnreadNotificationCount(notifications, audience) {
  const normalizedAudience = normalizeNotificationAudience(audience);
  return (Array.isArray(notifications) ? notifications : []).filter(
    (notification) => normalizeNotificationAudience(notification.audience) === normalizedAudience && !notification.read
  ).length;
}

export function getAudienceNotifications(notifications, audience) {
  const normalizedAudience = normalizeNotificationAudience(audience);
  return (Array.isArray(notifications) ? notifications : [])
    .filter((notification) => normalizeNotificationAudience(notification.audience) === normalizedAudience)
    .sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0));
}
