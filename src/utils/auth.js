// Helpers de login da loja e autenticação operacional de entregadores.

export function normalizeStoreCredential(value) {
  return String(value || "").trim();
}

export function normalizeStoreLogin(value) {
  return normalizeStoreCredential(value).toLowerCase();
}

export const STORE_USER_ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "gerente", label: "Gerente" },
  { value: "caixa", label: "Caixa" },
  { value: "operador", label: "Operador" },
];

export function normalizeStoreRole(role) {
  const normalizedRole = String(role || "operador").trim().toLowerCase();
  return STORE_USER_ROLES.some((item) => item.value === normalizedRole) ? normalizedRole : "operador";
}

export function getStoreRoleLabel(role) {
  const normalizedRole = normalizeStoreRole(role);
  return STORE_USER_ROLES.find((item) => item.value === normalizedRole)?.label || "Operador";
}

export function isStoreAdminRole(role) {
  return normalizeStoreRole(role) === "admin";
}

export function canManageStoreUsers(role) {
  return isStoreAdminRole(role);
}

export const STORE_ACTIONS = {
  APPROVE_ORDER: "approve_order",
  CANCEL_ORDER: "cancel_order",
  CONFIRM_PAYMENT: "confirm_payment",
  REOPEN_PAYMENT: "reopen_payment",
  REOPEN_COUNTER_SALE: "reopen_counter_sale",
  MANUAL_FINISH_DELIVERY: "manual_finish_delivery",
  ADJUST_STOCK: "adjust_stock",
  DELETE_PROMOTION: "delete_promotion",
  PAUSE_PRODUCT: "pause_product",
  DELETE_PRODUCT: "delete_product",
  EXPORT_REPORTS: "export_reports",
  OVERRIDE_STOCK: "override_stock",
};

const ROLE_ACTION_PERMISSIONS = {
  admin: Object.values(STORE_ACTIONS),
  gerente: [
    STORE_ACTIONS.APPROVE_ORDER,
    STORE_ACTIONS.CANCEL_ORDER,
    STORE_ACTIONS.CONFIRM_PAYMENT,
    STORE_ACTIONS.REOPEN_PAYMENT,
    STORE_ACTIONS.REOPEN_COUNTER_SALE,
    STORE_ACTIONS.MANUAL_FINISH_DELIVERY,
    STORE_ACTIONS.ADJUST_STOCK,
    STORE_ACTIONS.DELETE_PROMOTION,
    STORE_ACTIONS.PAUSE_PRODUCT,
    STORE_ACTIONS.DELETE_PRODUCT,
    STORE_ACTIONS.EXPORT_REPORTS,
    STORE_ACTIONS.OVERRIDE_STOCK,
  ],
  caixa: [
    STORE_ACTIONS.CONFIRM_PAYMENT,
    STORE_ACTIONS.REOPEN_PAYMENT,
    STORE_ACTIONS.REOPEN_COUNTER_SALE,
    STORE_ACTIONS.EXPORT_REPORTS,
  ],
  operador: [
    STORE_ACTIONS.APPROVE_ORDER,
    STORE_ACTIONS.CONFIRM_PAYMENT,
  ],
};

const ROLE_DISCOUNT_LIMITS = {
  admin: Infinity,
  gerente: 30,
  caixa: 10,
  operador: 5,
};

export function canPerformStoreAction(role, action) {
  const normalizedRole = normalizeStoreRole(role);
  return (ROLE_ACTION_PERMISSIONS[normalizedRole] || ROLE_ACTION_PERMISSIONS.operador).includes(action);
}

export function getStoreRoleDiscountLimit(role) {
  const normalizedRole = normalizeStoreRole(role);
  return ROLE_DISCOUNT_LIMITS[normalizedRole] ?? ROLE_DISCOUNT_LIMITS.operador;
}

export function describeStoreRoleDiscountLimit(role) {
  const limit = getStoreRoleDiscountLimit(role);
  return Number.isFinite(limit) ? `até R$ ${limit.toFixed(2).replace(".", ",")}` : "sem limite";
}

export function clampDiscountByStoreRole(discount, role) {
  const value = Math.max(0, Number(discount || 0));
  const limit = getStoreRoleDiscountLimit(role);
  return Number.isFinite(limit) ? Math.min(value, limit) : value;
}

export function canAccessStoreTab(role, tabId) {
  const normalizedRole = normalizeStoreRole(role);
  if (normalizedRole === "admin") return true;
  const permissions = {
    gerente: ["dashboard", "products", "kits", "promos", "deliveries", "counter", "cash", "tabs", "settings", "clients", "couriers", "diagnostics"],
    caixa: ["dashboard", "deliveries", "counter", "cash", "tabs", "clients"],
    operador: ["dashboard", "deliveries", "counter", "clients"],
  };
  return (permissions[normalizedRole] || permissions.operador).includes(tabId);
}

export function isValidLogin(login, password) {
  // Fallback legado para não travar a operação caso a tabela store_users ainda não exista.
  // A regra principal do Bloco 3 passa a ser validar a loja em store_users no Supabase.
  const normalizedLogin = normalizeStoreLogin(login);
  const normalizedPassword = normalizeStoreCredential(password);
  return (normalizedLogin === "loja" || normalizedLogin === "gabrieladmin") && normalizedPassword.length >= 4;
}

export function isStoreLoginLocked(lockedUntil) {
  return lockedUntil && Date.now() < new Date(lockedUntil).getTime();
}

export function getStoreLockMessage(lockedUntil) {
  const remainingMs = Math.max(0, new Date(lockedUntil || 0).getTime() - Date.now());
  const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
  return `Muitas tentativas inválidas. Aguarde ${remainingMinutes} minuto(s) para tentar novamente.`;
}

export function normalizeCourierCredential(value) {
  return String(value || "").trim();
}

export function isTruthyActive(value) {
  return value === true || value === "true" || value === 1 || value === "1" || value === undefined || value === null;
}

export function generateStrongPassword() {
  // Senha forte, mas simples para copiar e enviar ao entregador.
  // Evita caracteres que costumam confundir no WhatsApp ou teclado do celular.
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "@#%*";
  const all = upper + lower + numbers + symbols;
  const required = [upper, lower, numbers, symbols].map((group) => group[Math.floor(Math.random() * group.length)]);
  const remaining = Array.from({ length: 8 }, () => all[Math.floor(Math.random() * all.length)]);
  return [...required, ...remaining].sort(() => Math.random() - 0.5).join("");
}

export function isStrongPassword(password) {
  const value = String(password || "");
  return value.length >= 10 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);
}

export function hasDuplicateCourierUsername(couriers, username) {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  return couriers.some((courier) => courier.username.toLowerCase() === normalizedUsername);
}

export function isValidCourierLogin(couriers, username, password) {
  return Boolean(findCourierByLogin(couriers, username, password));
}

export function findCourierByLogin(couriers, username, password) {
  const normalizedUsername = normalizeCourierCredential(username).toLowerCase();
  const normalizedPassword = normalizeCourierCredential(password);
  return (Array.isArray(couriers) ? couriers : []).find((courier) => {
    const courierUsername = normalizeCourierCredential(courier.username).toLowerCase();
    const courierPassword = normalizeCourierCredential(courier.password);
    return isTruthyActive(courier.active) && courierUsername === normalizedUsername && courierPassword === normalizedPassword;
  });
}

export function isCourierUsernameAvailable(couriers, username, currentCourierId) {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  if (!normalizedUsername) return false;
  return !couriers.some((courier) => courier.id !== currentCourierId && courier.username.toLowerCase() === normalizedUsername);
}
