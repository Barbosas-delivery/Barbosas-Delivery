import { DELIVERY_STATUS, PAYMENT_STATUS, DELIVERY_PROBLEM_REASONS, ORDER_TYPE } from "../constants/appConstants";
import { initialStoreSettings, initialProductGroups, initialPromotions, initialKits, initialProducts, initialClients, initialCouriers, initialDeliveries } from "../constants/initialData";
import { money, isValidCep, formatCep, onlyPhoneNumbers, isValidBrazilMobilePhone, formatBrazilMobilePhone, normalizeBarcode, buildReceiptItemsHtml } from "./formatters";
import { toNonNegativeNumber, toPositiveInteger, toSafeMoneyNumber } from "./numbers";
import { getPaymentLabel, getPaymentStatusClass, isOrderAboveMinimum } from "./payments";
import { validateOrderItems, syncOrderItemsWithProducts, reduceProductStock, restoreProductStock } from "./stock";
import { normalizeProductVariants } from "../services/supabaseProducts";
import { getActiveProducts, hasDuplicateGroup, getVisibleProductGroups, normalizeGroupName, getActivePromotions, isPromotionInPeriod, buildKitProductsTotal, isKitInPeriod, getActiveKits } from "./catalog";
import { buildDayReport, buildCashClosingReport, buildStoreDeliveryFinancialSummary } from "./reports";
import { isDeliveryOrder, isCounterOrder, canCourierControlDelivery, normalizeDeliveryFee, buildDeliveryTotal, normalizeDiscount, calculateCourierFee, calculateStoreFee, buildDeliveryAddress, getCourierDeliveries, getOrderLabel, formatEstimatedDeliveryTime } from "./delivery";
import { createNotification } from "./notifications";
import { STORE_ACTIONS, canPerformStoreAction, clampDiscountByStoreRole, isValidLogin, isTruthyActive, isStrongPassword, hasDuplicateCourierUsername, isValidCourierLogin, isCourierUsernameAvailable } from "./auth";

function normalizeCustomerCartItem(item, index = 0) {
  if (!item || typeof item !== "object") return null;
  const isKit = item.isKit === true;
  const itemId = item.id ?? item.productId ?? `item-${index}`;
  const quantity = toPositiveInteger(item.quantity, 1);
  const price = toSafeMoneyNumber(item.price, 0);
  return {
    ...item,
    id: itemId,
    name: String(item.name || (isKit ? "Kit" : "Produto")),
    price,
    quantity,
    barcode: item.barcode || "",
    isKit,
    cartKey: String(item.cartKey || `${isKit ? "kit" : "prod"}-${itemId}-${item.kitId || ""}-${index}`),
    kitItems: isKit && Array.isArray(item.kitItems) ? item.kitItems.filter(Boolean) : item.kitItems,
  };
}

function sanitizeCustomerCart(cart) {
  return (Array.isArray(cart) ? cart : [])
    .map((item, index) => normalizeCustomerCartItem(item, index))
    .filter((item) => item && item.quantity > 0 && item.price >= 0);
}

function hasCurrencyValue(text, value) {
  const normalized = String(text || "").replace(/\u00a0/g, " ").replace(/&nbsp;/g, " ");
  return normalized.includes(money(value).replace(/\u00a0/g, " "));
}

function hasDuplicateBarcode(products, barcode) {
  const normalizedBarcode = normalizeBarcode(barcode);
  if (!normalizedBarcode) return false;
  return (Array.isArray(products) ? products : []).some((product) => (
    product.active !== false
    && !product.deletedAt
    && !product.deleted_at
    && normalizeBarcode(product.barcode) === normalizedBarcode
  ));
}

function makeUniqueNumericId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

function hasDuplicateClientRecord(clients, client, currentClientId = null) {
  const normalizedPhone = onlyPhoneNumbers(client?.phone);
  if (!normalizedPhone) return false;
  return (Array.isArray(clients) ? clients : []).some((existingClient) => {
    if (currentClientId !== null && String(existingClient.id) === String(currentClientId)) return false;
    return onlyPhoneNumbers(existingClient.phone) === normalizedPhone;
  });
}

function isProductBarcodeAvailable(products, barcode, currentProductId) {
  const normalizedBarcode = normalizeBarcode(barcode);
  if (!normalizedBarcode) return false;
  return !(Array.isArray(products) ? products : []).some((product) => (
    String(product.id) !== String(currentProductId)
    && product.active !== false
    && !product.deletedAt
    && !product.deleted_at
    && normalizeBarcode(product.barcode) === normalizedBarcode
  ));
}

function buildOrderTotal(items) {
  return sanitizeCustomerCart(items).reduce((sum, item) => sum + toSafeMoneyNumber(item.price, 0) * toPositiveInteger(item.quantity, 1), 0);
}

function normalizeCouponCode(value = "") {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function normalizeCouponFromDatabase(coupon = {}) {
  return {
    id: coupon.id || makeUniqueNumericId(),
    code: normalizeCouponCode(coupon.code),
    description: coupon.description || "",
    discountType: coupon.discount_type || coupon.discountType || "fixed",
    discountValue: Number(coupon.discount_value ?? coupon.discountValue ?? 0),
    minimumOrderValue: Number(coupon.minimum_order_value ?? coupon.minimumOrderValue ?? 0),
    maxDiscount: Number(coupon.max_discount ?? coupon.maxDiscount ?? 0),
    startDate: coupon.start_date || coupon.startDate || "",
    endDate: coupon.end_date || coupon.endDate || "",
    usageLimit: Number(coupon.usage_limit ?? coupon.usageLimit ?? 0),
    usedCount: Number(coupon.used_count ?? coupon.usedCount ?? 0),
    active: isTruthyActive(coupon.active),
    createdAt: coupon.created_at || coupon.createdAt || "",
    updatedAt: coupon.updated_at || coupon.updatedAt || "",
  };
}

function isCouponInPeriod(coupon) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (coupon?.startDate) {
    const start = new Date(`${coupon.startDate}T00:00:00`);
    if (Number.isFinite(start.getTime()) && today < start) return false;
  }
  if (coupon?.endDate) {
    const end = new Date(`${coupon.endDate}T23:59:59`);
    if (Number.isFinite(end.getTime()) && new Date() > end) return false;
  }
  return true;
}

function getCouponDiscount(coupon, productsTotal = 0) {
  const base = Math.max(0, Number(productsTotal || 0));
  if (!coupon || base <= 0) return 0;
  if (base < Number(coupon.minimumOrderValue || 0)) return 0;
  let discount = String(coupon.discountType || "fixed") === "percent" ? base * (Number(coupon.discountValue || 0) / 100) : Number(coupon.discountValue || 0);
  if (Number(coupon.maxDiscount || 0) > 0) discount = Math.min(discount, Number(coupon.maxDiscount || 0));
  return normalizeDiscount(discount, base);
}

function validateCouponForCart(coupon, productsTotal = 0) {
  if (!coupon) return { valid: false, message: "Cupom não encontrado." };
  if (!coupon.active) return { valid: false, message: "Esse cupom está inativo." };
  if (!isCouponInPeriod(coupon)) return { valid: false, message: "Esse cupom está fora do período de validade." };
  if (Number(coupon.usageLimit || 0) > 0 && Number(coupon.usedCount || 0) >= Number(coupon.usageLimit || 0)) return { valid: false, message: "Esse cupom atingiu o limite de uso." };
  if (Number(productsTotal || 0) < Number(coupon.minimumOrderValue || 0)) return { valid: false, message: `Esse cupom exige pedido mínimo de ${money(coupon.minimumOrderValue)} em produtos.` };
  if (getCouponDiscount(coupon, productsTotal) <= 0) return { valid: false, message: "Esse cupom não gera desconto para este pedido." };
  return { valid: true, message: "Cupom aplicado." };
}

function getActiveProductVariants(product) {
  return normalizeProductVariants(product?.variants).filter((variant) => variant.active !== false);
}

function productHasActiveVariants(product) {
  return product?.hasVariants === true && getActiveProductVariants(product).length > 0;
}

function makeVariantCartName(product, variant) {
  return `${product?.name || "Produto"} - ${variant?.name || "Sabor"}`;
}

const WEEKDAY_LABELS = [
  { day: 1, label: "Segunda" },
  { day: 2, label: "Terça" },
  { day: 3, label: "Quarta" },
  { day: 4, label: "Quinta" },
  { day: 5, label: "Sexta" },
  { day: 6, label: "Sábado" },
  { day: 0, label: "Domingo" },
];

function normalizeTimeValue(value, fallback = "09:00") {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hours = Math.min(23, Math.max(0, Number(match[1] || 0)));
  const minutes = Math.min(59, Math.max(0, Number(match[2] || 0)));
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function normalizeStoreSchedule(schedule) {
  const currentSchedule = Array.isArray(schedule) ? schedule : [];
  return WEEKDAY_LABELS.map(({ day, label }) => {
    const found = currentSchedule.find((item) => Number(item?.day) === Number(day));
    return {
      day,
      label: found?.label || label,
      closed: found?.closed === true,
      open: normalizeTimeValue(found?.open, day === 0 ? "13:00" : "09:00"),
      close: normalizeTimeValue(found?.close, day === 5 || day === 6 ? "03:00" : "00:00"),
    };
  });
}

function getMinutesFromTime(value) {
  const [hours, minutes] = normalizeTimeValue(value, "00:00").split(":").map(Number);
  return hours * 60 + minutes;
}

function getStoreOpenStatus(schedule, date = new Date()) {
  const normalizedSchedule = normalizeStoreSchedule(schedule);
  const currentDay = date.getDay();
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const today = normalizedSchedule.find((item) => Number(item.day) === currentDay);
  const previousDay = normalizedSchedule.find((item) => Number(item.day) === (currentDay + 6) % 7);

  const checkSchedule = (item, minutes, isPreviousDay = false) => {
    if (!item || item.closed) return false;
    const openMinutes = getMinutesFromTime(item.open);
    let closeMinutes = getMinutesFromTime(item.close);
    const crossesMidnight = closeMinutes <= openMinutes;
    if (!crossesMidnight) return !isPreviousDay && minutes >= openMinutes && minutes < closeMinutes;
    if (isPreviousDay) return minutes < closeMinutes;
    return minutes >= openMinutes;
  };

  const isOpen = checkSchedule(today, currentMinutes, false) || checkSchedule(previousDay, currentMinutes, true);
  if (isOpen) {
    const activeSchedule = checkSchedule(today, currentMinutes, false) ? today : previousDay;
    return { isOpen: true, message: `Aberto até ${activeSchedule.close}`, today };
  }
  if (!today || today.closed) return { isOpen: false, message: "Fechado hoje", today };
  return { isOpen: false, message: `Abre às ${today.open}`, today };
}

function buildOpeningHoursSummary(schedule) {
  return normalizeStoreSchedule(schedule)
    .map((item) => `${item.label}: ${item.closed ? "Fechado" : `${item.open} às ${item.close}`}`)
    .join(" • ");
}

function getTodayOpeningHours(schedule, date = new Date()) {
  const today = normalizeStoreSchedule(schedule).find((item) => Number(item.day) === date.getDay());
  if (!today) return "Horário de hoje não configurado";
  if (today.closed) return `${today.label}: fechado hoje`;
  return `${today.label}: ${today.open} às ${today.close}`;
}


const CUSTOMER_DISMISSED_ORDERS_STORAGE_KEY = "barbosas-delivery-customer-dismissed-orders-v1";
const DAILY_BACKUP_STORAGE_KEY = "barbosas-delivery-last-backup-at-v1";

function clampPrintCopies(value, fallback = 1) {
  return Math.min(5, Math.max(1, toPositiveInteger(value, fallback)));
}

function clampPrintCloseDelaySeconds(value) {
  const seconds = Math.floor(Number(value || 0));
  if (!Number.isFinite(seconds)) return 0;
  return Math.min(10, Math.max(0, seconds));
}

function sanitizePrintOutputMode(value) {
  return value === "local_service" ? "local_service" : "browser";
}

function sanitizeLocalPrintServiceUrl(value) {
  const url = String(value || "").trim();
  if (!url) return initialStoreSettings.localPrintServiceUrl || "http://localhost:9191/print";
  return url;
}

function clampLocalPrintTimeoutMs(value) {
  const timeout = Math.floor(Number(value || 5000));
  if (!Number.isFinite(timeout)) return 5000;
  return Math.min(15000, Math.max(1000, timeout));
}

function sanitizePauseUntil(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";
  const time = new Date(rawValue).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : "";
}

function getStorePauseStatus(settings = {}, date = new Date()) {
  const pausedUntil = sanitizePauseUntil(settings.storePausedUntil || settings.store_paused_until);
  if (!pausedUntil) return { active: false, message: "" };
  const until = new Date(pausedUntil);
  if (until.getTime() <= date.getTime()) return { active: false, message: "" };
  const timeLabel = until.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const reason = String(settings.storePauseReason || settings.store_pause_reason || "alta demanda").trim() || "alta demanda";
  return { active: true, until: pausedUntil, reason, message: `Pedidos pausados até ${timeLabel}. Motivo: ${reason}` };
}

function normalizeDistrictName(value = "") {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeDeliveryZone(zone = {}, index = 0) {
  const district = String(zone.district || zone.name || "").trim();
  return {
    id: zone.id || makeUniqueNumericId() + index,
    district,
    fee: normalizeDeliveryFee(zone.fee ?? zone.deliveryFee ?? initialStoreSettings.defaultDeliveryFee),
    minimumOrderValue: toNonNegativeNumber(zone.minimumOrderValue ?? zone.minimum_order_value ?? 0, 0),
    active: zone.active !== false && Boolean(district),
  };
}

function normalizeDeliveryZones(zones = []) {
  const normalized = (Array.isArray(zones) ? zones : [])
    .map((zone, index) => normalizeDeliveryZone(zone, index))
    .filter((zone) => zone.district);
  const seen = new Set();
  return normalized.filter((zone) => {
    const key = normalizeDistrictName(zone.district);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findDeliveryZoneByDistrict(zones = [], district = "") {
  const normalizedDistrict = normalizeDistrictName(district);
  if (!normalizedDistrict) return null;
  return normalizeDeliveryZones(zones).find((zone) => zone.active !== false && normalizeDistrictName(zone.district) === normalizedDistrict) || null;
}

function getCustomerDeliveryFee(settings = {}, district = "") {
  const zone = findDeliveryZoneByDistrict(settings.deliveryZones, district);
  return zone ? normalizeDeliveryFee(zone.fee) : normalizeDeliveryFee(settings.defaultDeliveryFee);
}

function getCustomerMinimumOrderValue(settings = {}, district = "") {
  const zone = findDeliveryZoneByDistrict(settings.deliveryZones, district);
  const zoneMinimum = Number(zone?.minimumOrderValue || 0);
  return zoneMinimum > 0 ? zoneMinimum : toNonNegativeNumber(settings.minimumOrderValue, initialStoreSettings.minimumOrderValue);
}

function getDeliveryZoneIssue(settings = {}, district = "") {
  const safeDistrict = String(district || "").trim();
  if (!safeDistrict) return "";
  if (settings.allowUnlistedDistricts !== false) return "";
  return findDeliveryZoneByDistrict(settings.deliveryZones, safeDistrict) ? "" : `Ainda não atendemos o bairro ${safeDistrict}. Fale com a loja pelo WhatsApp para confirmar.`;
}

function makeEmptyDeliveryZone() {
  return { id: makeUniqueNumericId(), district: "Novo bairro", fee: initialStoreSettings.defaultDeliveryFee, minimumOrderValue: 0, active: true };
}

function normalizeProductGroups(groups = []) {
  const mergedGroups = [...initialProductGroups, ...(Array.isArray(groups) ? groups : [])];
  const seen = new Set();
  return mergedGroups
    .map((group) => normalizeGroupName(group))
    .filter(Boolean)
    .filter((group) => {
      const key = group.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function mergeProductGroups(currentGroups = [], productsList = []) {
  return normalizeProductGroups([
    ...currentGroups,
    ...(Array.isArray(productsList) ? productsList.map((product) => product.category) : []),
  ]);
}

function sanitizeStoreSettings(settings = {}) {
  const source = settings && typeof settings === "object" ? settings : {};
  const schedule = normalizeStoreSchedule(source.schedule || initialStoreSettings.schedule);

  return {
    ...initialStoreSettings,
    ...source,
    storeName: String(source.storeName || initialStoreSettings.storeName).trim() || initialStoreSettings.storeName,
    storePhone: formatBrazilMobilePhone(source.storePhone || initialStoreSettings.storePhone),
    defaultDeliveryFee: normalizeDeliveryFee(source.defaultDeliveryFee ?? initialStoreSettings.defaultDeliveryFee),
    minimumOrderValue: toNonNegativeNumber(source.minimumOrderValue ?? initialStoreSettings.minimumOrderValue, initialStoreSettings.minimumOrderValue),
    allowUnlistedDistricts: source.allowUnlistedDistricts !== false,
    deliveryZones: normalizeDeliveryZones(source.deliveryZones || initialStoreSettings.deliveryZones),
    productGroups: normalizeProductGroups(source.productGroups || initialProductGroups),
    whatsappMessage: String(source.whatsappMessage || initialStoreSettings.whatsappMessage),
    statusWhatsappMessages: normalizeStatusWhatsAppMessages(source.statusWhatsappMessages || initialStoreSettings.statusWhatsappMessages),
    autoPrintCustomerOrders: source.autoPrintCustomerOrders !== false,
    customerOrderPrintCopies: clampPrintCopies(source.customerOrderPrintCopies, initialStoreSettings.customerOrderPrintCopies || 2),
    manualReprintCopies: clampPrintCopies(source.manualReprintCopies, initialStoreSettings.manualReprintCopies || 1),
    printCloseDelaySeconds: clampPrintCloseDelaySeconds(source.printCloseDelaySeconds),
    printOutputMode: sanitizePrintOutputMode(source.printOutputMode || initialStoreSettings.printOutputMode),
    localPrintServiceUrl: sanitizeLocalPrintServiceUrl(source.localPrintServiceUrl || initialStoreSettings.localPrintServiceUrl),
    localPrintFallbackToBrowser: source.localPrintFallbackToBrowser !== false,
    localPrintTimeoutMs: clampLocalPrintTimeoutMs(source.localPrintTimeoutMs || initialStoreSettings.localPrintTimeoutMs),
    maxActiveDeliveriesPerCourier: Math.min(6, Math.max(1, Math.floor(Number(source.maxActiveDeliveriesPerCourier ?? initialStoreSettings.maxActiveDeliveriesPerCourier ?? 2)))),
    storePausedUntil: sanitizePauseUntil(source.storePausedUntil || source.store_paused_until || initialStoreSettings.storePausedUntil),
    storePauseReason: String(source.storePauseReason || source.store_pause_reason || initialStoreSettings.storePauseReason || "").trim(),
    schedule,
    openingHours: buildOpeningHoursSummary(schedule),
  };
}

function loadInitialStoreSettings() {
  return sanitizeStoreSettings(initialStoreSettings);
}

function loadDismissedCustomerOrderIds() {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(CUSTOMER_DISMISSED_ORDERS_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.map((id) => String(id)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveDismissedCustomerOrderIds(ids) {
  if (typeof window === "undefined") return;
  try {
    const safeIds = Array.from(new Set((Array.isArray(ids) ? ids : []).map((id) => String(id)).filter(Boolean))).slice(-40);
    window.localStorage.setItem(CUSTOMER_DISMISSED_ORDERS_STORAGE_KEY, JSON.stringify(safeIds));
  } catch {
    // O painel do cliente continua funcionando mesmo se o navegador bloquear localStorage.
  }
}


function loadLastDailyBackupAt() {
  if (typeof window === "undefined") return "";
  try {
    return String(window.localStorage.getItem(DAILY_BACKUP_STORAGE_KEY) || "");
  } catch {
    return "";
  }
}

function saveLastDailyBackupAt(value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DAILY_BACKUP_STORAGE_KEY, String(value || new Date().toISOString()));
  } catch {
    // O lembrete de backup é apenas local; se o navegador bloquear, o sistema segue funcionando.
  }
}

function isSameLocalDate(value, date = new Date()) {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toLocaleDateString("pt-BR") === date.toLocaleDateString("pt-BR");
}

function formatBackupDate(value) {
  if (!value) return "Nenhum backup baixado neste navegador";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Data de backup inválida";
  return parsed.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatShortDateTime(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function getAuditActionLabel(action) {
  const labels = {
    approve_customer_order: "Pedido aprovado",
    accept_delivery: "Entrega aceita",
    request_delivery_approval: "Entrega enviada para aprovação",
    approve_delivery_completion: "Entrega aprovada/finalizada",
    manual_finish_delivery: "Entrega finalizada manualmente",
    update_payment_status: "Pagamento alterado",
    reopen_counter_sale: "Venda reaberta no PDV",
    cancel_order: "Pedido/venda cancelado",
    delete_promotion: "Promoção excluída",
    pause_product: "Produto pausado",
    resume_product: "Produto retomado",
    manual_stock_adjustment: "Estoque ajustado",
    pdv_stock_override: "Venda sem estoque autorizada",
    create_store_user: "Usuário criado",
    update_store_user: "Usuário atualizado",
    store_login_success: "Login da loja",
    store_login_failed: "Tentativa de login inválida",
    store_logout: "Saída da loja",
    print_receipt: "Comprovante impresso",
    export_period_sales_csv: "CSV de vendas exportado",
    export_stock_csv: "CSV de estoque exportado",
  };
  return labels[action] || String(action || "Ação").replace(/_/g, " ");
}

function getAuditEntityLabel(entity) {
  const labels = {
    orders: "Pedido/Venda",
    products: "Produto",
    promotions: "Promoção",
    store_users: "Usuário",
    cash_sessions: "Caixa",
    courier_closing: "Fechamento entregador",
    reports: "Relatório",
    store_session: "Sessão da loja",
  };
  return labels[entity] || String(entity || "Sistema");
}

function buildAuditSummary(log) {
  const data = log?.afterJson || {};
  const pieces = [];
  if (data.reason) pieces.push(`Motivo: ${data.reason}`);
  if (data.value !== undefined) pieces.push(`Valor: ${money(Number(data.value || 0))}`);
  if (data.status) pieces.push(`Status: ${data.status}`);
  if (data.paymentStatus) pieces.push(`Pagamento: ${data.paymentStatus}`);
  if (data.product) pieces.push(`Produto: ${data.product}`);
  if (data.rows !== undefined) pieces.push(`Linhas: ${data.rows}`);
  if (data.role) pieces.push(`Perfil: ${data.role}`);
  return pieces.join(" • ") || "Sem detalhes adicionais.";
}











function formatProductImageHelp() {
  return "Formatos aceitos: JPG, PNG ou WEBP. Melhor proporção: quadrada 1:1 ou vertical 4:5.";
}

function buildWhatsAppUrl(phone, message) {
  const numbers = onlyPhoneNumbers(phone);
  if (!numbers) return "#";
  const normalized = numbers.startsWith("55") ? numbers : `55${numbers}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function buildMapsUrl(address) {
  const cleanAddress = String(address || "").trim();
  if (!cleanAddress) return "#";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAddress)}`;
}

function getWhatsAppOrderItemsText(items = []) {
  const safeItems = Array.isArray(items) ? items : [];
  if (safeItems.length === 0) return "- Pedido sem itens detalhados";
  return safeItems
    .map((item) => {
      const quantity = Number(item.quantity || 0);
      const name = item.name || item.productName || "Produto";
      const unitPrice = Number(item.price || 0);
      const lineTotal = unitPrice * quantity;
      return `${quantity}x ${name} - ${money(lineTotal)}`;
    })
    .join("\n");
}

function buildCustomerWhatsAppMessage(delivery, storeSettings = initialStoreSettings) {
  const storeName = storeSettings.storeName || "Barbosas Delivery";
  const customerName = delivery.client || "cliente";
  const orderKind = isCounterOrder(delivery) ? "sua venda" : "seu pedido";
  const productsTotal = Number(delivery.productsTotal ?? Number(delivery.value || 0) - (isCounterOrder(delivery) ? 0 : normalizeDeliveryFee(delivery.deliveryFee)));
  const deliveryFee = isCounterOrder(delivery) ? 0 : normalizeDeliveryFee(delivery.deliveryFee);
  const discount = Number(delivery.discount || 0);
  const total = Number(delivery.value || 0);
  const estimated = Number(delivery.estimatedDeliveryMinutes || 0);
  const estimatedLine = isDeliveryOrder(delivery) && estimated > 0 ? `\nTempo estimado de entrega: ${formatEstimatedDeliveryTime(estimated)}.` : "";
  const paymentLine = delivery.payment ? `\nPagamento: ${getPaymentLabel(delivery.payment, delivery.changeFor, delivery.mixedPaymentDetails)}.` : "";

  return [
    `Olá, ${customerName}! ${orderKind.charAt(0).toUpperCase() + orderKind.slice(1)} #${delivery.id} foi recebido pela ${storeName}.`,
    "",
    "Resumo do pedido:",
    getWhatsAppOrderItemsText(delivery.items),
    "",
    `Subtotal: ${money(productsTotal)}`,
    discount > 0 ? `Desconto: -${money(discount)}` : null,
    `Taxa de entrega: ${money(deliveryFee)}`,
    `Total: ${money(total)}`,
    `${estimatedLine}${paymentLine}`,
    "",
    "Obrigado pela preferência!",
  ].filter((line) => line !== null).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function getWhatsAppTemplateVariables(delivery, storeSettings = initialStoreSettings) {
  const storeName = storeSettings.storeName || "Barbosas Delivery";
  const deliveryFee = isCounterOrder(delivery) ? 0 : normalizeDeliveryFee(delivery.deliveryFee);
  const total = Number(delivery.value || 0);
  const estimated = Number(delivery.estimatedDeliveryMinutes || 0);
  return {
    loja: storeName,
    cliente: delivery?.client || "cliente",
    pedido: String(delivery?.id || ""),
    total: money(total),
    taxa: money(deliveryFee),
    status: delivery?.status || "",
    previsao: estimated > 0 ? formatEstimatedDeliveryTime(estimated) : "em breve",
    pagamento: getPaymentLabel(delivery?.payment, delivery?.changeFor, delivery?.mixedPaymentDetails),
  };
}

function fillWhatsAppTemplate(template, delivery, storeSettings = initialStoreSettings) {
  const variables = getWhatsAppTemplateVariables(delivery, storeSettings);
  return String(template || "")
    .replace(/\{(loja|cliente|pedido|total|taxa|status|previsao|pagamento)\}/g, (_, key) => variables[key] || "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getDefaultStatusWhatsAppMessages() {
  return {
    approved: "Olá, {cliente}! Seu pedido #{pedido} foi aprovado pela {loja}.\n\nPrevisão: {previsao}.\nTotal: {total}.\n\nObrigado pela preferência!",
    outForDelivery: "Olá, {cliente}! Seu pedido #{pedido} saiu para entrega.\n\nO entregador já está a caminho. Total: {total}.\n\nObrigado pela preferência!",
    delivered: "Olá, {cliente}! Seu pedido #{pedido} foi entregue.\n\nA {loja} agradece pela preferência!",
    cancelled: "Olá, {cliente}. Seu pedido #{pedido} foi cancelado pela {loja}.\n\nSe precisar, responda esta mensagem para falar com a loja.",
    paymentReminder: "Olá, {cliente}! Passando para lembrar sobre o pagamento do pedido #{pedido}.\n\nValor: {total}. Forma informada: {pagamento}.",
  };
}

function normalizeStatusWhatsAppMessages(messages = {}) {
  const defaults = getDefaultStatusWhatsAppMessages();
  return {
    approved: String(messages.approved || defaults.approved),
    outForDelivery: String(messages.outForDelivery || defaults.outForDelivery),
    delivered: String(messages.delivered || defaults.delivered),
    cancelled: String(messages.cancelled || defaults.cancelled),
    paymentReminder: String(messages.paymentReminder || defaults.paymentReminder),
  };
}

function buildStatusWhatsAppMessage(delivery, statusKey, storeSettings = initialStoreSettings) {
  const templates = normalizeStatusWhatsAppMessages(storeSettings.statusWhatsappMessages);
  const template = templates[statusKey] || templates.approved;
  return fillWhatsAppTemplate(template, delivery, storeSettings);
}

function getWhatsAppStatusLabel(status) {
  if (status === "sent") return "Marcado como enviado";
  if (status === "opened") return "Aberto para envio";
  return "Não enviado";
}

function buildCustomerHistory(deliveries, phone) {
  const normalizedPhone = onlyPhoneNumbers(phone);
  const customerDeliveries = deliveries.filter((delivery) => onlyPhoneNumbers(delivery.phone) === normalizedPhone && delivery.status !== DELIVERY_STATUS.CANCELLED);
  return {
    totalOrders: customerDeliveries.length,
    totalSpent: customerDeliveries.reduce((sum, delivery) => sum + Number(delivery.value || 0), 0),
    lastOrders: customerDeliveries.slice(0, 3),
  };
}

function isCustomerOrderFinalStatus(status) {
  return [DELIVERY_STATUS.CONFIRMED_DELIVERED, DELIVERY_STATUS.CANCELLED].includes(status);
}

function getOrderTimeValue(delivery) {
  const dates = [delivery?.launchedAt, delivery?.createdAt, delivery?.approvedAt, delivery?.acceptedAt, delivery?.deliveredAt, delivery?.ownerApprovedAt, delivery?.cancelledAt]
    .map((value) => new Date(value || 0).getTime())
    .filter((value) => Number.isFinite(value) && value > 0);
  return dates.length > 0 ? Math.max(...dates) : Number(delivery?.id || 0);
}

const DELIVERY_DELAY_ALERT_MINUTES = 15;

function getDeliveryLaunchTimeValue(delivery) {
  const dates = [delivery?.launchedAt, delivery?.createdAt, delivery?.approvedAt, delivery?.acceptedAt, delivery?.pickedUpAt]
    .map((value) => new Date(value || 0).getTime())
    .filter((value) => Number.isFinite(value) && value > 0);
  return dates.length > 0 ? Math.min(...dates) : Number(delivery?.id || 0);
}

function getDeliveryAgeMinutes(delivery, nowMs = Date.now()) {
  const startedAt = getDeliveryLaunchTimeValue(delivery);
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((nowMs - startedAt) / 60000));
}

function isDeliveryDelayCandidate(delivery) {
  if (!isDeliveryOrder(delivery)) return false;
  if ([DELIVERY_STATUS.CANCELLED, DELIVERY_STATUS.CONFIRMED_DELIVERED].includes(delivery?.status)) return false;
  return [
    DELIVERY_STATUS.WAITING_PICKUP,
    DELIVERY_STATUS.OUT_FOR_DELIVERY,
    DELIVERY_STATUS.WAITING_OWNER_APPROVAL,
    DELIVERY_STATUS.DELIVERY_PROBLEM,
  ].includes(delivery?.status);
}

function isDeliveryDelayed(delivery, nowMs = Date.now()) {
  return isDeliveryDelayCandidate(delivery) && getDeliveryAgeMinutes(delivery, nowMs) >= DELIVERY_DELAY_ALERT_MINUTES;
}

function isCourierAssignedToDelivery(delivery, username) {
  const normalizedUsername = String(username || '').trim().toLowerCase();
  if (!normalizedUsername) return false;
  return [delivery?.pickedUpByUsername, delivery?.acceptedByUsername, delivery?.deliveredByUsername]
    .some((value) => String(value || '').trim().toLowerCase() === normalizedUsername);
}

function sortDeliveriesByPriority(a, b) {
  const now = Date.now();
  const delayedA = isDeliveryDelayed(a, now) ? 1 : 0;
  const delayedB = isDeliveryDelayed(b, now) ? 1 : 0;
  if (delayedA !== delayedB) return delayedB - delayedA;
  return getDeliveryLaunchTimeValue(a) - getDeliveryLaunchTimeValue(b);
}

function getDeliveryDistrict(delivery) {
  const rawDistrict = String(delivery?.district || delivery?.deliveryDistrict || delivery?.zoneDistrict || "").trim();
  if (rawDistrict) return rawDistrict;
  const address = String(delivery?.address || "");
  const parts = address.split(" - " );
  if (parts.length >= 2) return parts[1].split(",")[0].trim() || "Sem bairro";
  return "Sem bairro";
}

function buildDeliveryRouteGroups(deliveries = []) {
  const groups = new Map();
  deliveries.forEach((delivery) => {
    if (!isDeliveryOrder(delivery)) return;
    const district = getDeliveryDistrict(delivery);
    const current = groups.get(district) || { district, count: 0, delayedCount: 0, totalFee: 0, orderIds: [] };
    current.count += 1;
    current.delayedCount += isDeliveryDelayed(delivery) ? 1 : 0;
    current.totalFee += normalizeDeliveryFee(delivery.deliveryFee);
    current.orderIds.push(delivery.id);
    groups.set(district, current);
  });
  return Array.from(groups.values()).sort((a, b) => b.delayedCount - a.delayedCount || b.count - a.count || a.district.localeCompare(b.district));
}

function getCourierAssignedActiveDeliveries(deliveries = [], courierUsername = "") {
  return (Array.isArray(deliveries) ? deliveries : []).filter((delivery) => {
    if (!isDeliveryOrder(delivery)) return false;
    if ([DELIVERY_STATUS.CANCELLED, DELIVERY_STATUS.CONFIRMED_DELIVERED].includes(delivery?.status)) return false;
    return isCourierAssignedToDelivery(delivery, courierUsername);
  });
}

function getCourierAcceptBlockReason({ deliveries = [], courierUsername = "", maxActiveDeliveries = 2 } = {}) {
  const ownActive = getCourierAssignedActiveDeliveries(deliveries, courierUsername);
  const ownDelayed = ownActive.filter((delivery) => isDeliveryDelayed(delivery));
  if (ownDelayed.length > 0) return "Finalize a entrega atrasada antes de aceitar outra.";
  const limit = Math.min(6, Math.max(1, Math.floor(Number(maxActiveDeliveries || 2))));
  if (ownActive.length >= limit) return `Você já possui ${ownActive.length} entrega${ownActive.length === 1 ? "" : "s"} ativa${ownActive.length === 1 ? "" : "s"}. Limite atual: ${limit}.`;
  return "";
}


function buildStoreAttentionSummary({ products = [], deliveries = [], notifications = [], lastBackupAt = "" }) {
  const activeDeliveryOrders = deliveries.filter((delivery) => isDeliveryOrder(delivery) && ![DELIVERY_STATUS.CONFIRMED_DELIVERED, DELIVERY_STATUS.CANCELLED].includes(delivery.status));
  const delayedDeliveries = activeDeliveryOrders.filter((delivery) => isDeliveryDelayed(delivery)).sort(sortDeliveriesByPriority);
  const waitingApproval = [];
  const deliveryProblems = activeDeliveryOrders.filter((delivery) => delivery.status === DELIVERY_STATUS.DELIVERY_PROBLEM);
  const pendingPayments = deliveries.filter((delivery) => ![DELIVERY_STATUS.CANCELLED].includes(delivery.status) && [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.RECEIVABLE, PAYMENT_STATUS.STORE_CREDIT].includes(delivery.paymentStatus));
  const whatsappPending = activeDeliveryOrders.filter((delivery) => delivery.phone && delivery.whatsappStatus !== "sent");
  const lowStockProducts = products
    .filter((product) => product.active !== false)
    .filter((product) => Number(product.stock || 0) <= Number(product.minStock || 0))
    .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));
  const outOfStockProducts = lowStockProducts.filter((product) => Number(product.stock || 0) <= 0);
  const unreadStoreNotifications = notifications.filter((notification) => !notification.readAt && !notification.read_at && !notification.resolvedAt && !notification.resolved_at);
  const backupDue = !isSameLocalDate(lastBackupAt);

  const items = [
    ...delayedDeliveries.map((delivery) => ({
      type: "delay",
      severity: getDeliveryAgeMinutes(delivery) >= 25 ? "critical" : "high",
      title: `Pedido #${delivery.id} atrasado`,
      description: `${delivery.client || "Cliente"} • ${getDeliveryAgeMinutes(delivery)} min desde o lançamento • ${delivery.status}`,
      action: "Priorize a entrega ou fale com o entregador.",
    })),
    ...deliveryProblems.map((delivery) => ({
      type: "problem",
      severity: "critical",
      title: `Problema na entrega #${delivery.id}`,
      description: `${delivery.client || "Cliente"} • ${delivery.problemReason || "motivo não informado"}`,
      action: "Resolva com o entregador/cliente antes de liberar novas etapas.",
    })),
    ...pendingPayments.slice(0, 6).map((delivery) => ({
      type: "payment",
      severity: "medium",
      title: `Recebimento pendente #${delivery.id}`,
      description: `${delivery.client || "Cliente"} • ${delivery.paymentStatus || PAYMENT_STATUS.PENDING} • ${money(delivery.value || 0)}`,
      action: "Confirme o pagamento quando receber.",
    })),
    ...whatsappPending.slice(0, 6).map((delivery) => ({
      type: "whatsapp",
      severity: "medium",
      title: `WhatsApp não marcado #${delivery.id}`,
      description: `${delivery.client || "Cliente"} • ${formatBrazilMobilePhone(delivery.phone || "")}`,
      action: "Envie ou marque como enviado no card do pedido.",
    })),
    ...outOfStockProducts.slice(0, 8).map((product) => ({
      type: "stock_out",
      severity: "high",
      title: `${product.name} sem estoque`,
      description: `Estoque atual: ${product.stock || 0} • mínimo: ${product.minStock || 0}`,
      action: "Reponha, pause ou inative o produto.",
    })),
    ...lowStockProducts.filter((product) => Number(product.stock || 0) > 0).slice(0, 8).map((product) => ({
      type: "stock_low",
      severity: "medium",
      title: `${product.name} com estoque baixo`,
      description: `Estoque atual: ${product.stock || 0} • mínimo: ${product.minStock || 0}`,
      action: "Planeje reposição antes de acabar.",
    })),
    ...(backupDue ? [{
      type: "backup",
      severity: "medium",
      title: "Backup diário pendente",
      description: `Último backup: ${formatBackupDate(lastBackupAt)}`,
      action: "Baixe o backup operacional de hoje.",
    }] : []),
  ];

  return {
    items,
    delayedDeliveries,
    waitingApproval,
    deliveryProblems,
    pendingPayments,
    whatsappPending,
    lowStockProducts,
    outOfStockProducts,
    unreadStoreNotifications,
    backupDue,
  };
}

function getDeliveryCompletionTimeValue(delivery) {
  const dates = [delivery?.ownerApprovedAt, delivery?.deliveredAt, delivery?.finalizedAt, delivery?.closedAt]
    .map((value) => new Date(value || 0).getTime())
    .filter((value) => Number.isFinite(value) && value > 0);
  return dates.length > 0 ? Math.max(...dates) : 0;
}

function getDeliveryCompletionDate(delivery) {
  const completedAt = delivery?.ownerApprovedAt || delivery?.deliveredAt || delivery?.finalizedAt || delivery?.closedAt || delivery?.launchedAt || delivery?.createdAt || "";
  return String(completedAt).slice(0, 10);
}

function getDeliveryCompletionMinutes(delivery) {
  const startedAt = getDeliveryLaunchTimeValue(delivery);
  const completedAt = getDeliveryCompletionTimeValue(delivery);
  if (!startedAt || !completedAt || completedAt < startedAt) return 0;
  return Math.max(0, Math.floor((completedAt - startedAt) / 60000));
}

function isDeliveryCompletedByCourier(delivery, courierUsername = "") {
  if (!isDeliveryOrder(delivery)) return false;
  if (delivery.status !== DELIVERY_STATUS.CONFIRMED_DELIVERED && delivery.ownerApproved !== true) return false;
  return isCourierAssignedToDelivery(delivery, courierUsername);
}

function isDateInInputRange(dateText, startDate = "", endDate = "") {
  if (!dateText) return false;
  if (startDate && dateText < startDate) return false;
  if (endDate && dateText > endDate) return false;
  return true;
}

function buildCourierClosingReport(deliveries = [], courierUsername = "", startDate = "", endDate = "") {
  const normalizedUsername = String(courierUsername || "").trim().toLowerCase();
  const completed = (deliveries || [])
    .filter((delivery) => {
      if (!normalizedUsername || !isDeliveryCompletedByCourier(delivery, normalizedUsername)) return false;
      return isDateInInputRange(getDeliveryCompletionDate(delivery), startDate, endDate);
    })
    .slice()
    .sort((a, b) => getDeliveryCompletionTimeValue(b) - getDeliveryCompletionTimeValue(a));

  const grossDeliveryFee = completed.reduce((sum, delivery) => sum + normalizeDeliveryFee(delivery.deliveryFee), 0);
  const courierAmount = completed.reduce((sum, delivery) => sum + Number(delivery.courierFee ?? calculateCourierFee(delivery.deliveryFee, delivery.motorcycleType)), 0);
  const storeAmount = completed.reduce((sum, delivery) => sum + Number(delivery.storeFee ?? calculateStoreFee(delivery.deliveryFee, delivery.motorcycleType)), 0);
  const ownMotorcycleCount = completed.filter((delivery) => !String(delivery.motorcycleType || "").toLowerCase().includes("estabelecimento")).length;
  const storeMotorcycleCount = completed.filter((delivery) => String(delivery.motorcycleType || "").toLowerCase().includes("estabelecimento")).length;
  const delayedCount = completed.filter((delivery) => getDeliveryCompletionMinutes(delivery) >= DELIVERY_DELAY_ALERT_MINUTES).length;
  const totalMinutes = completed.reduce((sum, delivery) => sum + getDeliveryCompletionMinutes(delivery), 0);

  return {
    courierUsername,
    startDate,
    endDate,
    deliveries: completed,
    completedCount: completed.length,
    grossDeliveryFee,
    courierAmount,
    storeAmount,
    ownMotorcycleCount,
    storeMotorcycleCount,
    delayedCount,
    averageMinutes: completed.length > 0 ? Math.round(totalMinutes / completed.length) : 0,
  };
}

function buildCourierTodaySummary(deliveries = [], courierUsername = '') {
  const today = new Date().toISOString().slice(0, 10);
  return buildCourierClosingReport(deliveries, courierUsername, today, today);
}

function getCustomerOrderStatusInfo(delivery) {
  const status = delivery?.status;
  if (status === DELIVERY_STATUS.WAITING_STORE_APPROVAL || status === DELIVERY_STATUS.WAITING_PICKUP) {
    return { title: "Pedido recebido", description: "A loja recebeu seu pedido. Ele será preparado e liberado para entrega.", tone: "emerald", step: 2 };
  }
  if (status === DELIVERY_STATUS.OUT_FOR_DELIVERY) {
    return { title: "Saiu para entrega", description: "Seu pedido saiu para entrega. Fique atento ao telefone.", tone: "blue", step: 4 };
  }
  if (status === DELIVERY_STATUS.WAITING_OWNER_APPROVAL) {
    return { title: "Entrega em confirmação", description: "O entregador informou a entrega. A loja está conferindo a finalização.", tone: "blue", step: 4 };
  }
  if (status === DELIVERY_STATUS.CONFIRMED_DELIVERED) {
    return { title: "Pedido entregue", description: "Pedido entregue. Obrigado pela preferência!", tone: "emerald", step: 5, final: true };
  }
  if (status === DELIVERY_STATUS.DELIVERY_PROBLEM) {
    return { title: "Atenção na entrega", description: "Houve uma ocorrência na entrega. Fale com a loja se precisar de ajuda.", tone: "red", step: 4, important: true };
  }
  if (status === DELIVERY_STATUS.CANCELLED) {
    return { title: "Pedido cancelado", description: "Seu pedido foi cancelado pela loja.", tone: "red", step: 0, final: true, important: true };
  }
  return { title: status || "Pedido em andamento", description: "Acompanhe a atualização do seu pedido por aqui.", tone: "amber", step: 1 };
}

function getCustomerOrderTimeline(status) {
  const info = getCustomerOrderStatusInfo({ status });
  const steps = [
    { key: "received", label: "Recebido" },
    { key: "approval", label: "Aprovação" },
    { key: "preparing", label: "Preparando" },
    { key: "route", label: "Entrega" },
    { key: "done", label: "Finalizado" },
  ];
  if (status === DELIVERY_STATUS.CANCELLED) {
    return steps.map((step, index) => ({ ...step, done: index === 0, current: index === 0, cancelled: index > 0 }));
  }
  return steps.map((step, index) => ({ ...step, done: index <= info.step - 1, current: index === Math.max(0, info.step - 1) }));
}

function getLastCustomerOrderUpdate(delivery, notifications = []) {
  const relatedNotifications = (notifications || [])
    .filter((notification) => String(notification.orderId || notification.deliveryId) === String(delivery?.id))
    .sort((a, b) => getOrderTimeValue({ launchedAt: b.createdAt }) - getOrderTimeValue({ launchedAt: a.createdAt }));
  if (relatedNotifications[0]?.message) return relatedNotifications[0].message;
  const info = getCustomerOrderStatusInfo(delivery);
  return info.description;
}

function getCustomerOrderItemsSummary(items = []) {
  const safeItems = Array.isArray(items) ? items : [];
  const itemCount = safeItems.reduce((sum, item) => sum + toPositiveInteger(item.quantity, 0), 0);
  return `${itemCount} item${itemCount === 1 ? "" : "s"} • ${safeItems.length} produto${safeItems.length === 1 ? "" : "s"}`;
}





function getCartMatchKey(item) {
  if (!item) return "";
  return String(item.cartKey || item.id || item.productId || "");
}

function getCustomerCartLineIdentity(item) {
  if (!item || typeof item !== "object") return "";
  if (item.isKit === true) return `kit-${item.kitId || item.id || ""}`;
  if (item.variantId) return `product-${item.id || item.productId || ""}-variant-${item.variantId}`;
  return `product-${item.id || item.productId || ""}`;
}

function mergeCustomerCartItems(cart) {
  const merged = [];
  sanitizeCustomerCart(cart).forEach((item) => {
    const identity = getCustomerCartLineIdentity(item) || getCartMatchKey(item);
    const existingIndex = merged.findIndex((currentItem) => (getCustomerCartLineIdentity(currentItem) || getCartMatchKey(currentItem)) === identity);
    if (existingIndex >= 0) {
      merged[existingIndex] = {
        ...merged[existingIndex],
        quantity: toPositiveInteger(merged[existingIndex].quantity, 0) + toPositiveInteger(item.quantity, 0),
      };
      return;
    }
    merged.push(item);
  });
  return merged;
}

function getCustomerCheckoutIssue({ cart, products, productsTotal, minimumOrderValue, storeIsOpen, storeMessage, customerForm, payment, changeFor, deliveryTotal, deliveryZoneIssue = "" }) {
  if (deliveryZoneIssue) return deliveryZoneIssue;
  if (!storeIsOpen) return `A loja está fechada no momento. ${storeMessage || "Tente novamente dentro do horário de atendimento."}`;
  if (!isCustomerFormComplete(customerForm)) return "Confira seus dados de entrega antes de finalizar.";
  if (customerForm?.phone && !isValidBrazilMobilePhone(customerForm.phone)) return "Telefone inválido. Corrija o número antes de finalizar.";
  const validation = validateOrderItems(cart, products);
  if (!validation.valid) return validation.message;
  if (!isOrderAboveMinimum(productsTotal, minimumOrderValue)) return `Pedido mínimo de ${money(minimumOrderValue)} em produtos. Adicione mais itens para finalizar.`;
  const changeForValue = toSafeMoneyNumber(changeFor, 0);
  if (payment === "Dinheiro" && changeFor !== "" && changeForValue > 0 && changeForValue < deliveryTotal) return `O valor para troco precisa ser maior ou igual ao total do pedido: ${money(deliveryTotal)}.`;
  return "";
}

function isOrderFinalized(order) {
  return [DELIVERY_STATUS.CONFIRMED_DELIVERED, DELIVERY_STATUS.CANCELLED].includes(order?.status);
}

function normalizeDeliveryProblemReasonInput(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  const numericIndex = Number(raw);
  if (Number.isInteger(numericIndex) && numericIndex >= 1 && numericIndex <= DELIVERY_PROBLEM_REASONS.length) {
    return DELIVERY_PROBLEM_REASONS[numericIndex - 1];
  }
  const matchedReason = DELIVERY_PROBLEM_REASONS.find((reason) => reason.toLowerCase() === raw.toLowerCase());
  return matchedReason || raw;
}

function promptDeliveryProblemReason() {
  const optionsText = DELIVERY_PROBLEM_REASONS.map((reason, index) => `${index + 1}. ${reason}`).join("\n");
  const selected = window.prompt(`Informe o motivo do problema na entrega:\n\n${optionsText}\n\nDigite o número ou descreva o motivo.`, "1");
  const reason = normalizeDeliveryProblemReasonInput(selected);
  if (!reason) return "";
  if (reason === "Outro motivo") {
    const details = window.prompt("Descreva o problema na entrega:", "") || "";
    const trimmedDetails = details.trim();
    return trimmedDetails ? `Outro motivo: ${trimmedDetails}` : "";
  }
  return reason;
}

function getOrderAllowedActions(order, role = "admin") {
  const status = order?.status;
  const isDelivery = isDeliveryOrder(order);
  const isCounter = isCounterOrder(order);
  const finalized = isOrderFinalized(order);
  const waitingPickup = status === DELIVERY_STATUS.WAITING_PICKUP;
  const outForDelivery = status === DELIVERY_STATUS.OUT_FOR_DELIVERY;
  const waitingOwnerApproval = status === DELIVERY_STATUS.WAITING_OWNER_APPROVAL;
  const deliveryProblem = status === DELIVERY_STATUS.DELIVERY_PROBLEM;
  const paymentPaid = order?.paymentStatus === PAYMENT_STATUS.PAID;
  const canApprove = canPerformStoreAction(role, STORE_ACTIONS.APPROVE_ORDER);
  const canCancel = canPerformStoreAction(role, STORE_ACTIONS.CANCEL_ORDER);
  const canConfirmPayment = canPerformStoreAction(role, STORE_ACTIONS.CONFIRM_PAYMENT);
  const canReopenPayment = canPerformStoreAction(role, STORE_ACTIONS.REOPEN_PAYMENT);
  const canReopenCounterSale = canPerformStoreAction(role, STORE_ACTIONS.REOPEN_COUNTER_SALE);
  const canManualFinish = canPerformStoreAction(role, STORE_ACTIONS.MANUAL_FINISH_DELIVERY);

  if (isCounter && status === DELIVERY_STATUS.CONFIRMED_DELIVERED) {
    return {
      print: true,
      summary: true,
      reopenCounterSale: canReopenCounterSale,
      whatsapp: false,
      approve: false,
      manualFinish: false,
      cancel: false,
      confirmPayment: false,
      reopenPayment: false,
    };
  }

  if (finalized) {
    return {
      print: true,
      summary: true,
      reopenCounterSale: false,
      whatsapp: false,
      approve: false,
      manualFinish: false,
      cancel: false,
      confirmPayment: false,
      reopenPayment: false,
    };
  }

  if (isDelivery) {
    return {
      print: true,
      summary: true,
      whatsapp: Boolean(order?.phone),
      approve: canApprove && waitingOwnerApproval,
      manualFinish: canManualFinish && (outForDelivery || deliveryProblem),
      cancel: canCancel && (waitingPickup || deliveryProblem),
      confirmPayment: canConfirmPayment && !paymentPaid,
      reopenPayment: canReopenPayment && paymentPaid && !waitingOwnerApproval,
      reopenCounterSale: false,
    };
  }

  return {
    print: true,
    summary: true,
    whatsapp: false,
    approve: false,
    manualFinish: false,
    cancel: canCancel && status !== DELIVERY_STATUS.CANCELLED,
    confirmPayment: canConfirmPayment && !paymentPaid,
    reopenPayment: canReopenPayment && paymentPaid,
    reopenCounterSale: false,
  };
}

function buildOrderSummaryText(order) {
  const itemsText = (Array.isArray(order?.items) ? order.items : [])
    .map((item) => `${item.quantity}x ${item.name} - ${money(Number(item.price || 0) * Number(item.quantity || 0))}`)
    .join("\n");
  return [
    `${isCounterOrder(order) ? "Venda" : "Pedido"} #${order?.id || ""}`,
    `Cliente: ${order?.client || "-"}`,
    `Status: ${order?.status || "-"}`,
    `Pagamento: ${order?.paymentStatus || PAYMENT_STATUS.PENDING}`,
    `Total: ${money(order?.value || 0)}`,
    "",
    "Itens:",
    itemsText || "Sem itens detalhados",
  ].join("\n");
}

function getDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function isCustomerFormComplete(customer) {
  return Boolean(
    customer.name &&
      customer.phone &&
      isValidCep(customer.cep) &&
      customer.street &&
      customer.number &&
      customer.district &&
      customer.city &&
      customer.state
  );
}

function runSelfTests() {
  const tests = [
    { name: "Login da loja com senha válida", passed: isValidLogin("loja", "1234") === true },
    { name: "Login bloqueia senha curta", passed: isValidLogin("loja", "123") === false },
    { name: "Login legado não aceita qualquer e-mail", passed: isValidLogin("gabriel@loja.com", "1234") === false },
    { name: "Código de barras duplicado é detectado", passed: hasDuplicateBarcode(initialProducts, "7894900011517") === true },
    { name: "Código de barras novo é permitido", passed: hasDuplicateBarcode(initialProducts, "0001112223334") === false },
    { name: "Produto editado não pode duplicar código de barras", passed: isProductBarcodeAvailable(initialProducts, "0001112223334", 1) === true && isProductBarcodeAvailable(initialProducts, "7894900011517", 1) === false },
    { name: "Relatório soma entregas corretamente", passed: buildDayReport(initialProducts, initialDeliveries).totalDelivery === 71 },
    { name: "PDV balcão entra no caixa sem virar entrega pendente", passed: buildDayReport(initialProducts, [...initialDeliveries, { orderType: ORDER_TYPE.COUNTER, status: DELIVERY_STATUS.CONFIRMED_DELIVERED, value: 10, productsTotal: 10, deliveryFee: 0 }]).pending === 2 },
    { name: "Taxas lançadas contam somente entregas", passed: buildDayReport(initialProducts, [...initialDeliveries, { orderType: ORDER_TYPE.COUNTER, status: DELIVERY_STATUS.CONFIRMED_DELIVERED, value: 10, productsTotal: 10 }]).deliveryFeesTotal === 10 },
    { name: "Notificação nova começa como não lida", passed: createNotification("pedido", "Teste", "Mensagem", "loja").read === false },
    { name: "Promoção ativa precisa apontar para produto ativo", passed: getActivePromotions(initialPromotions, initialProducts).length === 1 },
    { name: "Promoção sem período fica ativa até desativar manualmente", passed: isPromotionInPeriod({ startDate: "", endDate: "" }) === true },
    { name: "Kit soma valor dos produtos cadastrados", passed: buildKitProductsTotal([{ productId: 1, quantity: 2 }], initialProducts) === 34 },
    { name: "Kit sem data final fica ativo até retirar manualmente", passed: isKitInPeriod({ endDate: "" }) === true },
    { name: "Kit ativo precisa ter produtos ativos e estoque suficiente", passed: getActiveKits(initialKits, initialProducts).length === 1 },
    { name: "Kit sem produto não aparece para cliente nem PDV", passed: getActiveKits([{ id: 99, active: true, endDate: "", items: [] }], initialProducts).length === 0 },
    { name: "Kit mantém itens internos para baixar estoque", passed: syncOrderItemsWithProducts([{ isKit: true, price: 44, kitItems: [{ id: 1, quantity: 2 }] }], initialProducts)[0].kitItems[0].id === 1 },
    { name: "Relatório identifica estoque baixo", passed: buildDayReport(initialProducts, initialDeliveries).lowStock === 1 },
    { name: "CEP aceita somente 8 números válidos", passed: isValidCep("87000-000") === true && isValidCep("8700") === false },
    { name: "Cliente completo também precisa de CEP válido", passed: isCustomerFormComplete({ name: "Teste", phone: "(43) 98873-6791", cep: "8700", street: "Rua A", number: "1", district: "Centro", city: "Cidade", state: "PR" }) === false },
    { name: "CEP é formatado antes de salvar", passed: formatCep("87000000") === "87000-000" },
    {
      name: "Telefone exige DDD + 9 + 8 dígitos",
      passed: isValidBrazilMobilePhone("(43) 98873-6791") === true && isValidBrazilMobilePhone("(43) 8873-6791") === false,
    },
    { name: "Telefone é formatado com DDD, 9 e traço", passed: formatBrazilMobilePhone("43988736791") === "(43) 98873-6791" },
    { name: "WhatsApp não duplica código do Brasil", passed: buildWhatsAppUrl("5543988736791", "teste").startsWith("https://wa.me/5543") },
    { name: "Mensagem de status substitui variáveis", passed: buildStatusWhatsAppMessage({ id: 123, client: "João", value: 52, payment: "Pix", estimatedDeliveryMinutes: 21 }, "approved", { storeName: "Loja Teste", statusWhatsappMessages: { approved: "Pedido {pedido} de {cliente} na {loja}: {total}" } }).includes("Pedido 123 de João na Loja Teste: R$ 52,00") },
    { name: "Pedido soma itens corretamente", passed: buildOrderTotal([{ price: 17, quantity: 2 }, { price: 5, quantity: 3 }]) === 49 },
    { name: "Pagamento em dinheiro mostra troco", passed: hasCurrencyValue(getPaymentLabel("Dinheiro", 100), 100) },
    { name: "Histórico do cliente soma compras pelo telefone", passed: buildCustomerHistory([{ phone: "(43) 99999-0000", value: 20, status: DELIVERY_STATUS.CONFIRMED_DELIVERED }], "43999990000").totalSpent === 20 },
    { name: "Pedido bloqueia produto inativo ou sem estoque", passed: validateOrderItems([{ id: 1, name: "Teste", quantity: 1 }], [{ id: 1, active: false, stock: 10, name: "Teste" }]).valid === false && validateOrderItems([{ id: 2, name: "Teste", quantity: 9 }], [{ id: 2, active: true, stock: 2, name: "Teste" }]).valid === false },
    { name: "Estoque baixa quando pedido é lançado", passed: reduceProductStock([{ id: 1, stock: 10 }], [{ id: 1, quantity: 3 }])[0].stock === 7 },
    { name: "Cancelamento devolve estoque", passed: restoreProductStock([{ id: 1, stock: 7 }], [{ id: 1, quantity: 3 }])[0].stock === 10 },
    { name: "Fechamento de caixa separa recebido e pendente", passed: buildCashClosingReport([{ value: 50, payment: "Pix", paymentStatus: PAYMENT_STATUS.PAID, status: DELIVERY_STATUS.CONFIRMED_DELIVERED }, { value: 20, payment: "Dinheiro", paymentStatus: PAYMENT_STATUS.PENDING, status: DELIVERY_STATUS.WAITING_PICKUP }]).totalReceived === 50 },
    { name: "Pedido mínimo bloqueia valor abaixo do configurado", passed: isOrderAboveMinimum(19, 20) === false && isOrderAboveMinimum(20, 20) === true },
    { name: "Pagamento visual destaca pendência", passed: getPaymentStatusClass(PAYMENT_STATUS.PENDING).includes("red") && getPaymentStatusClass(PAYMENT_STATUS.PAID).includes("emerald") },
    { name: "Depois da retirada só o motoboy responsável controla a entrega", passed: canCourierControlDelivery({ pickedUpByUsername: "moto01" }, "moto02") === false && canCourierControlDelivery({ pickedUpByUsername: "moto01" }, "moto01") === true },
    { name: "Problema na entrega só deve ser registrado após saída da loja", passed: DELIVERY_STATUS.OUT_FOR_DELIVERY === "Saiu para entrega" },
    { name: "Rótulo diferencia venda de pedido", passed: getOrderLabel({ orderType: ORDER_TYPE.COUNTER }, true) === "Venda" && getOrderLabel({ orderType: ORDER_TYPE.DELIVERY }, true) === "Pedido" },
    { name: "Pedido novo não exige aprovação da loja", passed: true },
    { name: "Taxa de entrega de R$5 é somada automaticamente", passed: buildDeliveryTotal(49) === 54 },
    { name: "PDV permite alterar taxa de entrega", passed: buildDeliveryTotal(49, 8, 0) === 57 },
    { name: "PDV usa R$5 quando taxa não for preenchida", passed: buildDeliveryTotal(49, "", 0) === 54 },
    { name: "PDV aplica desconto no total", passed: buildDeliveryTotal(49, 5, 4) === 50 },
    { name: "Desconto nunca passa do valor dos produtos", passed: normalizeDiscount(999, 49) === 49 && normalizeDiscount(-10, 49) === 0 },
    { name: "Limite de desconto respeita perfil", passed: clampDiscountByStoreRole(50, "operador") === 5 && clampDiscountByStoreRole(50, "caixa") === 10 && clampDiscountByStoreRole(50, "gerente") === 30 },
    { name: "Operador não pode cancelar nem reabrir venda", passed: getOrderAllowedActions({ orderType: ORDER_TYPE.COUNTER, status: DELIVERY_STATUS.CONFIRMED_DELIVERED, paymentStatus: PAYMENT_STATUS.PAID }, "operador").reopenCounterSale === false && getOrderAllowedActions({ orderType: ORDER_TYPE.DELIVERY, status: DELIVERY_STATUS.WAITING_PICKUP, paymentStatus: PAYMENT_STATUS.PENDING }, "operador").cancel === false },
    { name: "Somente gerente e administrador autorizam venda sem estoque", passed: canPerformStoreAction("gerente", STORE_ACTIONS.OVERRIDE_STOCK) === true && canPerformStoreAction("admin", STORE_ACTIONS.OVERRIDE_STOCK) === true && canPerformStoreAction("caixa", STORE_ACTIONS.OVERRIDE_STOCK) === false && canPerformStoreAction("operador", STORE_ACTIONS.OVERRIDE_STOCK) === false },
    { name: "Taxa de entrega divide 70% motoboy e 30% loja quando moto é do estabelecimento", passed: calculateCourierFee(5, "Moto do estabelecimento") === 3.5 && calculateStoreFee(5, "Moto do estabelecimento") === 1.5 },
    { name: "Moto própria não cobra 30% da loja", passed: calculateCourierFee(5, "Moto própria") === 5 && calculateStoreFee(5, "Moto própria") === 0 },
    { name: "Endereço da entrega é montado pelo cliente", passed: buildDeliveryAddress(initialClients[0]) === "Av. Brasil, 1500 - Centro, Maringá/PR" },
    {
      name: "Impressão monta itens do pedido",
      passed: hasCurrencyValue(buildReceiptItemsHtml([{ name: "Teste", price: 10, quantity: 2 }]), 20),
    },
    { name: "Impressão não quebra pedido antigo sem itens", passed: buildReceiptItemsHtml([]).includes("Pedido sem itens detalhados") },
    {
      name: "Cliente web precisa preencher endereço completo e telefone",
      passed: isCustomerFormComplete({ name: "Gabriel", phone: "(43) 98873-6791", cep: "86610-000", street: "Av. Paraná", number: "480", district: "Centro", city: "Jaguapitã", state: "PR" }) === true,
    },
    { name: "Cliente web não precisa criar conta", passed: isValidLogin("cliente", "") === false },
    { name: "Senha forte do entregador tem maiúscula, minúscula, número e símbolo", passed: isStrongPassword("B4rb@2026!") === true && isStrongPassword("senha123") === false },
    { name: "Usuário duplicado de entregador é bloqueado", passed: hasDuplicateCourierUsername(initialCouriers, "MOTO01") === true },
    { name: "Login do entregador só funciona se estiver ativo", passed: isValidCourierLogin(initialCouriers, "moto01", "B4rb@2026!") === true },
    { name: "Painel do entregador ignora pedidos cancelados", passed: getCourierDeliveries([...initialDeliveries, { status: DELIVERY_STATUS.CANCELLED }]).length === 2 },
    { name: "Pedido do cliente entra liberado para entregador", passed: getCourierDeliveries([{ orderType: ORDER_TYPE.DELIVERY, origin: "customer", status: DELIVERY_STATUS.WAITING_PICKUP, needsStoreApproval: false, storeOrderApproved: true }]).length === 1 },
    { name: "Fechamento ignora pedidos cancelados", passed: buildCashClosingReport([{ value: 100, paymentStatus: PAYMENT_STATUS.PAID, status: DELIVERY_STATUS.CANCELLED }]).totalSold === 0 },
    { name: "Fechamento conta pendência só de entregas", passed: buildCashClosingReport([{ orderType: ORDER_TYPE.COUNTER, value: 10, paymentStatus: PAYMENT_STATUS.PAID, status: DELIVERY_STATUS.CONFIRMED_DELIVERED }, { orderType: ORDER_TYPE.DELIVERY, value: 20, paymentStatus: PAYMENT_STATUS.PENDING, status: DELIVERY_STATUS.WAITING_PICKUP }]).pendingOrders === 1 },
    { name: "Fechamento separa venda balcão de entrega", passed: buildCashClosingReport([{ orderType: ORDER_TYPE.COUNTER, value: 10, paymentStatus: PAYMENT_STATUS.PAID, status: DELIVERY_STATUS.CONFIRMED_DELIVERED }, { orderType: ORDER_TYPE.DELIVERY, value: 20, paymentStatus: PAYMENT_STATUS.PAID, status: DELIVERY_STATUS.CONFIRMED_DELIVERED }]).counterSold === 10 && buildCashClosingReport([{ orderType: ORDER_TYPE.COUNTER, value: 10, paymentStatus: PAYMENT_STATUS.PAID, status: DELIVERY_STATUS.CONFIRMED_DELIVERED }, { orderType: ORDER_TYPE.DELIVERY, value: 20, paymentStatus: PAYMENT_STATUS.PAID, status: DELIVERY_STATUS.CONFIRMED_DELIVERED }]).deliverySold === 20 },
    { name: "Venda balcão finalizada mostra só reimpressão, resumo e reabrir PDV", passed: getOrderAllowedActions({ orderType: ORDER_TYPE.COUNTER, status: DELIVERY_STATUS.CONFIRMED_DELIVERED, paymentStatus: PAYMENT_STATUS.PAID }).print === true && getOrderAllowedActions({ orderType: ORDER_TYPE.COUNTER, status: DELIVERY_STATUS.CONFIRMED_DELIVERED, paymentStatus: PAYMENT_STATUS.PAID }).reopenCounterSale === true && getOrderAllowedActions({ orderType: ORDER_TYPE.COUNTER, status: DELIVERY_STATUS.CONFIRMED_DELIVERED, paymentStatus: PAYMENT_STATUS.PAID }).cancel === false },
    { name: "Pedido entregue não exibe ações operacionais indevidas", passed: getOrderAllowedActions({ orderType: ORDER_TYPE.DELIVERY, status: DELIVERY_STATUS.CONFIRMED_DELIVERED, paymentStatus: PAYMENT_STATUS.PAID }).approve === false && getOrderAllowedActions({ orderType: ORDER_TYPE.DELIVERY, status: DELIVERY_STATUS.CONFIRMED_DELIVERED, paymentStatus: PAYMENT_STATUS.PAID }).manualFinish === false && getOrderAllowedActions({ orderType: ORDER_TYPE.DELIVERY, status: DELIVERY_STATUS.CONFIRMED_DELIVERED, paymentStatus: PAYMENT_STATUS.PAID }).cancel === false },
    { name: "Cliente vê somente produtos ativos e não pausados", passed: getActiveProducts([{ active: true }, { active: false }, { active: true, pausedUntil: new Date(Date.now() + 60_000).toISOString() }]).length === 1 },
    { name: "Pausa temporária da loja fecha pedidos online", passed: getStorePauseStatus({ storePausedUntil: new Date(Date.now() + 60_000).toISOString(), storePauseReason: "Teste" }).active === true },
    { name: "Taxa por bairro substitui taxa padrão", passed: getCustomerDeliveryFee({ defaultDeliveryFee: 5, deliveryZones: [{ district: "Centro", fee: 8, active: true }] }, "centro") === 8 },
    { name: "Bairro não cadastrado pode ser bloqueado", passed: getDeliveryZoneIssue({ allowUnlistedDistricts: false, deliveryZones: [{ district: "Centro", fee: 5, active: true }] }, "Zona 7").includes("não atendemos") },
    { name: "Grupos de produtos não podem duplicar", passed: hasDuplicateGroup(["Bebidas"], "bebidas") === true },
    { name: "Cliente vê grupos com produtos ativos", passed: getVisibleProductGroups(initialProducts, initialProductGroups).includes("Bebidas") === true },
    { name: "Carrinho do cliente soma linhas repetidas do mesmo sabor", passed: mergeCustomerCartItems([{ id: 1, variantId: "uva", price: 10, quantity: 1 }, { id: 1, variantId: "uva", price: 10, quantity: 2 }]).length === 1 && mergeCustomerCartItems([{ id: 1, variantId: "uva", price: 10, quantity: 1 }, { id: 1, variantId: "uva", price: 10, quantity: 2 }])[0].quantity === 3 },
    { name: "Checkout do cliente bloqueia loja fechada", passed: getCustomerCheckoutIssue({ cart: [{ id: 1, price: 20, quantity: 1 }], products: [{ id: 1, active: true, stock: 10, name: "Teste" }], productsTotal: 20, minimumOrderValue: 10, storeIsOpen: false, storeMessage: "Abre às 09:00", customerForm: { name: "Gabriel", phone: "(43) 98873-6791", cep: "86610-000", street: "Av. Paraná", number: "480", district: "Centro", city: "Jaguapitã", state: "PR" }, payment: "Pix", changeFor: "", deliveryTotal: 25 }).includes("fechada") },
    { name: "Checkout do cliente bloqueia troco menor que total", passed: getCustomerCheckoutIssue({ cart: [{ id: 1, price: 20, quantity: 1 }], products: [{ id: 1, active: true, stock: 10, name: "Teste" }], productsTotal: 20, minimumOrderValue: 10, storeIsOpen: true, storeMessage: "Aberto", customerForm: { name: "Gabriel", phone: "(43) 98873-6791", cep: "86610-000", street: "Av. Paraná", number: "480", district: "Centro", city: "Jaguapitã", state: "PR" }, payment: "Dinheiro", changeFor: "10", deliveryTotal: 25 }).includes("troco") },
    { name: "Entregas sem motoboy também aparecem para todos os entregadores", passed: getCourierDeliveries(initialDeliveries).every((delivery) => delivery.courierUsername === "ALL") },
    { name: "Limite de entregas ativas bloqueia novo aceite", passed: getCourierAcceptBlockReason({ deliveries: [{ orderType: ORDER_TYPE.DELIVERY, status: DELIVERY_STATUS.OUT_FOR_DELIVERY, pickedUpByUsername: "moto01" }, { orderType: ORDER_TYPE.DELIVERY, status: DELIVERY_STATUS.OUT_FOR_DELIVERY, pickedUpByUsername: "moto01" }], courierUsername: "moto01", maxActiveDeliveries: 2 }).includes("Limite") },
    { name: "Agrupamento por região soma entregas", passed: buildDeliveryRouteGroups([{ orderType: ORDER_TYPE.DELIVERY, status: DELIVERY_STATUS.WAITING_PICKUP, district: "Centro", deliveryFee: 7 }, { orderType: ORDER_TYPE.DELIVERY, status: DELIVERY_STATUS.WAITING_PICKUP, address: "Rua A, 1 - Centro, Cidade/PR", deliveryFee: 5 }])[0].count === 2 },
    { name: "PDV balcão não aparece para entregadores", passed: getCourierDeliveries([...initialDeliveries, { orderType: ORDER_TYPE.COUNTER, status: DELIVERY_STATUS.CONFIRMED_DELIVERED }]).length === initialDeliveries.length },
    { name: "Tipo de pedido inválido não quebra validações", passed: isDeliveryOrder(null) === false && isCounterOrder(null) === false },
    { name: "Sincronizar pedido vazio não quebra", passed: Array.isArray(syncOrderItemsWithProducts(null, initialProducts)) && syncOrderItemsWithProducts(null, initialProducts).length === 0 },
    { name: "Usuário de entregador editado não pode duplicar outro", passed: isCourierUsernameAvailable(initialCouriers, "moto02", 1) === true && isCourierUsernameAvailable(initialCouriers, "moto01", 999) === false },
    {
      name: "Resumo financeiro da loja soma 30% e 70% das entregas aprovadas",
      passed:
        buildStoreDeliveryFinancialSummary([
          { status: DELIVERY_STATUS.CONFIRMED_DELIVERED, ownerApproved: true, deliveryFee: 5, courierFee: 3.5, storeFee: 1.5 },
        ]).storeAmount === 1.5 &&
        buildStoreDeliveryFinancialSummary([
          { status: DELIVERY_STATUS.CONFIRMED_DELIVERED, ownerApproved: true, deliveryFee: 5, courierFee: 3.5, storeFee: 1.5 },
        ]).courierAmount === 3.5,
    },
  ];

  return tests;
}


export {
  normalizeCustomerCartItem,
  sanitizeCustomerCart,
  hasCurrencyValue,
  hasDuplicateBarcode,
  makeUniqueNumericId,
  hasDuplicateClientRecord,
  isProductBarcodeAvailable,
  buildOrderTotal,
  normalizeCouponCode,
  normalizeCouponFromDatabase,
  isCouponInPeriod,
  getCouponDiscount,
  validateCouponForCart,
  getActiveProductVariants,
  productHasActiveVariants,
  makeVariantCartName,
  WEEKDAY_LABELS,
  normalizeTimeValue,
  normalizeStoreSchedule,
  getMinutesFromTime,
  getStoreOpenStatus,
  buildOpeningHoursSummary,
  getTodayOpeningHours,
  CUSTOMER_DISMISSED_ORDERS_STORAGE_KEY,
  DAILY_BACKUP_STORAGE_KEY,
  clampPrintCopies,
  clampPrintCloseDelaySeconds,
  sanitizePrintOutputMode,
  sanitizeLocalPrintServiceUrl,
  clampLocalPrintTimeoutMs,
  sanitizePauseUntil,
  getStorePauseStatus,
  normalizeDistrictName,
  normalizeDeliveryZone,
  normalizeDeliveryZones,
  findDeliveryZoneByDistrict,
  getCustomerDeliveryFee,
  getCustomerMinimumOrderValue,
  getDeliveryZoneIssue,
  makeEmptyDeliveryZone,
  normalizeProductGroups,
  mergeProductGroups,
  sanitizeStoreSettings,
  loadInitialStoreSettings,
  loadDismissedCustomerOrderIds,
  saveDismissedCustomerOrderIds,
  loadLastDailyBackupAt,
  saveLastDailyBackupAt,
  isSameLocalDate,
  formatBackupDate,
  formatShortDateTime,
  getAuditActionLabel,
  getAuditEntityLabel,
  buildAuditSummary,
  formatProductImageHelp,
  buildWhatsAppUrl,
  buildMapsUrl,
  getWhatsAppOrderItemsText,
  buildCustomerWhatsAppMessage,
  getWhatsAppTemplateVariables,
  fillWhatsAppTemplate,
  getDefaultStatusWhatsAppMessages,
  normalizeStatusWhatsAppMessages,
  buildStatusWhatsAppMessage,
  getWhatsAppStatusLabel,
  buildCustomerHistory,
  isCustomerOrderFinalStatus,
  getOrderTimeValue,
  DELIVERY_DELAY_ALERT_MINUTES,
  getDeliveryLaunchTimeValue,
  getDeliveryAgeMinutes,
  isDeliveryDelayCandidate,
  isDeliveryDelayed,
  isCourierAssignedToDelivery,
  sortDeliveriesByPriority,
  getDeliveryDistrict,
  buildDeliveryRouteGroups,
  getCourierAssignedActiveDeliveries,
  getCourierAcceptBlockReason,
  buildStoreAttentionSummary,
  getDeliveryCompletionTimeValue,
  getDeliveryCompletionDate,
  getDeliveryCompletionMinutes,
  isDeliveryCompletedByCourier,
  isDateInInputRange,
  buildCourierClosingReport,
  buildCourierTodaySummary,
  getCustomerOrderStatusInfo,
  getCustomerOrderTimeline,
  getLastCustomerOrderUpdate,
  getCustomerOrderItemsSummary,
  getCartMatchKey,
  getCustomerCartLineIdentity,
  mergeCustomerCartItems,
  getCustomerCheckoutIssue,
  isOrderFinalized,
  normalizeDeliveryProblemReasonInput,
  promptDeliveryProblemReason,
  getOrderAllowedActions,
  buildOrderSummaryText,
  getDateInputValue,
  isCustomerFormComplete,
  runSelfTests
};
