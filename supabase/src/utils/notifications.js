export function normalizeNotificationAudience(audience) {
  const value = String(audience || "loja").trim().toLowerCase();
  if (value === "couriers" || value === "entregadores") return "courier";
  if (value === "owner" || value === "store" || value === "loja") return "loja";
  return value || "loja";
}

export function normalizeNotificationCourierUsername(username) {
  return String(username || "").trim().toLowerCase();
}

export function createNotification(type, title, message, audience = "loja", deliveryId = null, options = {}) {
  const courierUsername = normalizeNotificationCourierUsername(options.courierUsername);

  return {
    id: Date.now() + Math.random(),
    type,
    title,
    message,
    audience: normalizeNotificationAudience(audience),
    deliveryId,
    orderId: deliveryId,
    courierUsername,
    customerPhone: String(options.customerPhone || ""),
    read: false,
    readAt: null,
    resolvedAt: options.resolvedAt || null,
    createdAt: new Date().toISOString(),
  };
}

export function isNotificationForAudience(notification, audience, currentCourierUsername = "") {
  const normalizedAudience = normalizeNotificationAudience(audience);
  const notificationAudience = normalizeNotificationAudience(notification?.audience);
  if (notificationAudience !== normalizedAudience) return false;

  if (normalizedAudience !== "courier") return true;

  const notificationCourierUsername = normalizeNotificationCourierUsername(notification?.courierUsername || notification?.courier_username);
  const loggedCourierUsername = normalizeNotificationCourierUsername(currentCourierUsername);

  // Notificação sem entregador específico é geral para todos os entregadores.
  // Notificação com usuário específico só aparece para aquele entregador.
  return !notificationCourierUsername || !loggedCourierUsername || notificationCourierUsername === loggedCourierUsername;
}

export function isNotificationActive(notification) {
  return notification?.read !== true && !notification?.readAt && !notification?.read_at && !notification?.resolvedAt && !notification?.resolved_at;
}

export function getUnreadNotificationCount(notifications, audience, currentCourierUsername = "") {
  return (Array.isArray(notifications) ? notifications : []).filter(
    (notification) => isNotificationForAudience(notification, audience, currentCourierUsername) && isNotificationActive(notification)
  ).length;
}

export function getAudienceNotifications(notifications, audience, currentCourierUsername = "") {
  return (Array.isArray(notifications) ? notifications : [])
    .filter((notification) => isNotificationForAudience(notification, audience, currentCourierUsername) && isNotificationActive(notification))
    .sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0));
}
