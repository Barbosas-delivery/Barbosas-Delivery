import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { insertWithSchemaRetry, updateWithSchemaRetry } from "./services/supabaseSchema";
import {
  loadProductsFromSupabase,
  mapProductFromDatabase,
  buildProductInsertPayload,
  buildProductPatch,
  insertProductInSupabase,
  updateProductInSupabase,
  updateProductStatusInSupabase,
  updateProductImageInSupabase,
  softDeleteProductInSupabase,
  normalizeProductVariants,
} from "./services/supabaseProducts";
import {
  mapClientFromDatabase,
  mapClientToDatabase,
  loadClientsFromSupabase,
  insertClientInSupabase,
  updateClientInSupabase,
  softDeleteClientInSupabase,
} from "./services/supabaseClients";
import {
  mapCourierFromDatabase,
  mapCourierToDatabase,
  loadCouriersFromSupabase,
  insertCourierInSupabase,
  updateCourierInSupabase,
  updateCourierStatusInSupabase,
  softDeleteCourierInSupabase,
} from "./services/supabaseCouriers";
import { loadNotificationsFromSupabase, saveNotificationToSupabaseService } from "./services/supabaseNotifications";
import { writeAuditLog, writeAppError } from "./services/supabaseAudit";
import {
  fetchOrderPaymentsFromSupabase,
  cancelExistingOrderPaymentsInSupabase,
  saveOrderPaymentsInSupabase,
  saveStockMovementsInSupabase,
  loadDeliveriesFromSupabase,
  insertOrderWithItemsInSupabase,
  updateOrderInSupabase,
} from "./services/supabaseOrders";
import {
  loadCashDataFromSupabase,
  findOpenCashSessionFromSupabase,
  openCashSessionInSupabase,
  insertCashSangriaInSupabase,
  closeCashSessionInSupabase,
} from "./services/supabaseCash";
import { loadTabsAccountsFromSupabase, persistTabAccountInSupabase } from "./services/supabaseTabs";
import { loadStoreSettingsFromSupabaseService, saveStoreSettingsToSupabaseService } from "./services/supabaseStoreSettings";
import {
  APP_VERSION,
  DELIVERY_STATUS,
  PAYMENT_STATUS,
  CANCELLATION_REASONS,
  ORDER_TYPE,
  DEFAULT_TAB_CREDIT_LIMIT,
  TAB_FAST_PAYMENT_BONUS,
  TAB_DELAY_PENALTY,
  TAB_DELAY_LIMIT_HOURS,
} from "./constants/appConstants";
import {
  initialStoreSettings,
  initialProductGroups,
  initialPromotions,
  initialKits,
  initialProducts,
  initialClients,
  initialCouriers,
  initialDeliveries,
} from "./constants/initialData";
import {
  money,
  onlyCepNumbers,
  isValidCep,
  formatCep,
  onlyPhoneNumbers,
  isValidBrazilMobilePhone,
  formatBrazilMobilePhone,
  normalizePhoneInput,
  normalizeBarcode,
  escapeHtml,
  buildReceiptItemsHtml,
} from "./utils/formatters";
import {
  toNonNegativeNumber,
  toPositiveInteger,
  toSafeMoneyNumber,
  toSafeNumber,
  calculateChangeDue,
} from "./utils/numbers";
import {
  getPaymentLabel,
  createEmptyMixedPayment,
  getMixedPaymentTotal,
  getMixedPaymentDetails,
  isMixedPaymentBalanced,
  isOrderAboveMinimum,
  getPaymentStatusClass,
} from "./utils/payments";
import {
  validateOrderItems,
  syncOrderItemsWithProducts,
  reduceProductStock,
  restoreProductStock,
} from "./utils/stock";
import {
  calculatePromotionFromPercent,
  getPromotionPrice,
  getProductActivePromotion,
  getProductSalePrice,
  isPromotionInPeriod,
  getActivePromotions,
  getPromotionProduct,
  buildKitProductsTotal,
  isKitInPeriod,
  getActiveKits,
  getCustomerVisibleKits,
  getKitItemsForOrder,
  describeKitItems,
  getActiveProducts,
  normalizeGroupName,
  hasDuplicateGroup,
  getVisibleProductGroups,
  groupProductsByCategory,
} from "./utils/catalog";
import {
  buildDayReport,
  buildCashClosingReport,
  getOrderDateMs,
  buildPeriodSalesReport,
  buildProductSalesReport,
  buildCategorySalesReport,
  buildPrintableRowsHtml,
  buildStoreDeliveryFinancialSummary,
} from "./utils/reports";
import {
  isDeliveryOrder,
  isCounterOrder,
  needsStoreApprovalBeforeCourier,
  canCourierControlDelivery,
  normalizeDeliveryFee,
  buildDeliveryTotal,
  buildDiscountedProductsTotal,
  normalizeDiscount,
  calculateCourierFee,
  calculateStoreFee,
  buildDeliveryAddress,
  getCourierDeliveries,
  getStatusClass,
  getOrderLabel,
  buildOrderConfirmation,
  buildEstimatedDeliveryMinutes,
  formatEstimatedDeliveryTime,
} from "./utils/delivery";
import {
  normalizeNotificationAudience,
  createNotification,
  getUnreadNotificationCount,
  getAudienceNotifications,
} from "./utils/notifications";
import {
  normalizeStoreCredential,
  normalizeStoreLogin,
  isValidLogin,
  isStoreLoginLocked,
  getStoreLockMessage,
  isTruthyActive,
  generateStrongPassword,
  isStrongPassword,
  hasDuplicateCourierUsername,
  isValidCourierLogin,
  findCourierByLogin,
  isCourierUsernameAvailable,
} from "./utils/auth";

import { printThermalHtml as printThermalHtmlBase } from "./utils/printing";

// Bloco 4: ajustes de layout e experiência por perfil. Cliente/entregador mobile-first; caixa/admin otimizados para tablet e desktop.
const Card = memo(function Card({ className = "", children, ...props }) {
  return <div className={className} {...props}>{children}</div>;
});

const CardContent = memo(function CardContent({ className = "", children, ...props }) {
  return <div className={className} {...props}>{children}</div>;
});

const Button = memo(function Button({ className = "", variant = "default", children, disabled = false, ...props }) {
  const hasCustomBg = /(?:^|\s)!?bg-/.test(className);
  const disabledClass = disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "";
  const variantClass =
    variant === "secondary"
      ? `${hasCustomBg ? "" : "bg-zinc-100 hover:bg-zinc-200"} text-zinc-950`
      : `${hasCustomBg ? "" : "bg-zinc-950 hover:bg-zinc-800"} text-white`;

  return (
    <button
      {...props}
      type={props.type || "button"}
      disabled={disabled}
      className={`inline-flex min-h-[44px] touch-manipulation items-center justify-center transition active:scale-[0.99] ${variantClass} ${className} ${disabledClass}`.trim()}
    >
      <span className="relative z-10 inline-flex items-center justify-center gap-1 text-inherit">{children}</span>
    </button>
  );
});

function getStableFocusKey(label = "", placeholder = "", type = "text") {
  return `${label}-${placeholder}-${type}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function keepInputFocused(event, focusKey) {
  const currentInput = event.currentTarget;
  const start = currentInput.selectionStart;
  const end = currentInput.selectionEnd;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  window.requestAnimationFrame(() => {
    const target = currentInput.isConnected ? currentInput : document.querySelector(`[data-focus-key="${focusKey}"]`);
    if (!target) return;
    if (document.activeElement !== target) target.focus({ preventScroll: true });
    try {
      if (typeof start === "number" && typeof end === "number") target.setSelectionRange(start, end);
    } catch {
      // Mantém o foco sem interromper a digitação caso o navegador não permita setSelectionRange.
    }
    window.scrollTo(scrollX, scrollY);
  });
}
const ICONS = {
  lock: "🔒",
  mail: "✉️",
  user: "👤",
  package: "📦",
  percent: "%",
  calendar: "⏱️",
  chart: "📊",
  barcode: "▥",
  truck: "🛵",
  users: "👥",
  search: "🔎",
  plus: "+",
  check: "✅",
  alert: "⚠️",
  logout: "↪",
  shield: "🛡️",
  eye: "👁️",
  eyeOff: "🙈",
  pin: "📍",
  phone: "☎️",
  save: "💾",
  money: "💰",
  bell: "🔔",
};

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
  return products.some((product) => String(product.barcode) === String(barcode));
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
  const normalizedBarcode = String(barcode || "").trim();
  if (!normalizedBarcode) return false;
  return !products.some((product) => product.id !== currentProductId && String(product.barcode) === normalizedBarcode);
}

function buildOrderTotal(items) {
  return sanitizeCustomerCart(items).reduce((sum, item) => sum + toSafeMoneyNumber(item.price, 0) * toPositiveInteger(item.quantity, 1), 0);
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


const STORE_SETTINGS_STORAGE_KEY = "barbosas-delivery-store-settings-v1";

function clampPrintCopies(value, fallback = 1) {
  return Math.min(5, Math.max(1, toPositiveInteger(value, fallback)));
}

function clampPrintCloseDelaySeconds(value) {
  const seconds = Math.floor(Number(value || 0));
  if (!Number.isFinite(seconds)) return 0;
  return Math.min(10, Math.max(0, seconds));
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
    whatsappMessage: String(source.whatsappMessage || initialStoreSettings.whatsappMessage),
    autoPrintCustomerOrders: source.autoPrintCustomerOrders !== false,
    customerOrderPrintCopies: clampPrintCopies(source.customerOrderPrintCopies, initialStoreSettings.customerOrderPrintCopies || 2),
    manualReprintCopies: clampPrintCopies(source.manualReprintCopies, initialStoreSettings.manualReprintCopies || 1),
    printCloseDelaySeconds: clampPrintCloseDelaySeconds(source.printCloseDelaySeconds),
    schedule,
    openingHours: buildOpeningHoursSummary(schedule),
  };
}

function loadStoreSettingsFromLocalStorage() {
  if (typeof window === "undefined") return sanitizeStoreSettings(initialStoreSettings);
  try {
    const storedSettings = window.localStorage.getItem(STORE_SETTINGS_STORAGE_KEY);
    return sanitizeStoreSettings(storedSettings ? JSON.parse(storedSettings) : initialStoreSettings);
  } catch {
    return sanitizeStoreSettings(initialStoreSettings);
  }
}

function saveStoreSettingsToLocalStorage(settings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_SETTINGS_STORAGE_KEY, JSON.stringify(sanitizeStoreSettings(settings)));
  } catch {
    // O navegador pode bloquear localStorage em modo privado; o app continua usando o estado atual.
  }
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





function getCartMatchKey(item) {
  if (!item) return "";
  return String(item.cartKey || item.id || item.productId || "");
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
    { name: "Notificação de aprovação só faz sentido quando aguardava aprovação", passed: DELIVERY_STATUS.WAITING_OWNER_APPROVAL === "Aguardando aprovação da loja" },
    { name: "Taxa de entrega de R$5 é somada automaticamente", passed: buildDeliveryTotal(49) === 54 },
    { name: "PDV permite alterar taxa de entrega", passed: buildDeliveryTotal(49, 8, 0) === 57 },
    { name: "PDV usa R$5 quando taxa não for preenchida", passed: buildDeliveryTotal(49, "", 0) === 54 },
    { name: "PDV aplica desconto no total", passed: buildDeliveryTotal(49, 5, 4) === 50 },
    { name: "Desconto nunca passa do valor dos produtos", passed: normalizeDiscount(999, 49) === 49 && normalizeDiscount(-10, 49) === 0 },
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
    { name: "Pedido do cliente não aparece para entregador antes da aprovação", passed: getCourierDeliveries([{ orderType: ORDER_TYPE.DELIVERY, origin: "customer", status: DELIVERY_STATUS.WAITING_STORE_APPROVAL, needsStoreApproval: true, storeOrderApproved: false }]).length === 0 && getCourierDeliveries([{ orderType: ORDER_TYPE.DELIVERY, origin: "customer", status: DELIVERY_STATUS.WAITING_PICKUP, needsStoreApproval: true, storeOrderApproved: false }]).length === 1 },
    { name: "Fechamento ignora pedidos cancelados", passed: buildCashClosingReport([{ value: 100, paymentStatus: PAYMENT_STATUS.PAID, status: DELIVERY_STATUS.CANCELLED }]).totalSold === 0 },
    { name: "Fechamento conta pendência só de entregas", passed: buildCashClosingReport([{ orderType: ORDER_TYPE.COUNTER, value: 10, paymentStatus: PAYMENT_STATUS.PAID, status: DELIVERY_STATUS.CONFIRMED_DELIVERED }, { orderType: ORDER_TYPE.DELIVERY, value: 20, paymentStatus: PAYMENT_STATUS.PENDING, status: DELIVERY_STATUS.WAITING_PICKUP }]).pendingOrders === 1 },
    { name: "Fechamento separa venda balcão de entrega", passed: buildCashClosingReport([{ orderType: ORDER_TYPE.COUNTER, value: 10, paymentStatus: PAYMENT_STATUS.PAID, status: DELIVERY_STATUS.CONFIRMED_DELIVERED }, { orderType: ORDER_TYPE.DELIVERY, value: 20, paymentStatus: PAYMENT_STATUS.PAID, status: DELIVERY_STATUS.CONFIRMED_DELIVERED }]).counterSold === 10 && buildCashClosingReport([{ orderType: ORDER_TYPE.COUNTER, value: 10, paymentStatus: PAYMENT_STATUS.PAID, status: DELIVERY_STATUS.CONFIRMED_DELIVERED }, { orderType: ORDER_TYPE.DELIVERY, value: 20, paymentStatus: PAYMENT_STATUS.PAID, status: DELIVERY_STATUS.CONFIRMED_DELIVERED }]).deliverySold === 20 },
    { name: "Cliente vê somente produtos ativos", passed: getActiveProducts([{ active: true }, { active: false }]).length === 1 },
    { name: "Grupos de produtos não podem duplicar", passed: hasDuplicateGroup(["Bebidas"], "bebidas") === true },
    { name: "Cliente vê grupos com produtos ativos", passed: getVisibleProductGroups(initialProducts, initialProductGroups).includes("Bebidas") === true },
    { name: "Entregas sem motoboy também aparecem para todos os entregadores", passed: getCourierDeliveries(initialDeliveries).every((delivery) => delivery.courierUsername === "ALL") },
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

function DarkLoginInput({ icon, label, value, onChange, placeholder, type = "text", rightButton = null }) {
  const focusKey = getStableFocusKey(label, placeholder, type);
  return (
    <div>
      <label className="text-sm text-zinc-300">{label}</label>
      <div className="mt-2 flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3">
        <Icon name={icon} className="text-zinc-400" />
        <input
          data-focus-key={focusKey}
          value={value ?? ""}
          onChange={(event) => {
            keepInputFocused(event, focusKey);
            onChange?.(event.target.value);
          }}
          placeholder={placeholder}
          type={type}
          className="min-h-[44px] bg-transparent text-base outline-none text-white w-full placeholder:text-zinc-500"
        />
        {rightButton}
      </div>
    </div>
  );
}

function Icon({ name, className = "" }) {
  return <span aria-hidden="true" className={`inline-flex h-5 min-w-5 items-center justify-center text-base leading-none ${className}`}>{ICONS[name] || "•"}</span>;
}

function StoreLogo({ size = "h-14 w-14" }) {
  return (
    <div
      aria-label="Logo Conveniência Barbosa's"
      className={`${size} shrink-0 rounded-full bg-yellow-300 text-black border border-yellow-200 shadow-sm flex flex-col items-center justify-center overflow-hidden px-1`}
    >
      <span className="text-[5px] font-medium tracking-tight leading-none">
        Conveniência
      </span>

      <span className="text-[8px] font-extrabold tracking-[-0.05em] leading-none mt-[1px]">
        BARBOSA'S
      </span>

      <div className="mt-[2px] h-[1px] w-6 bg-black/30 rounded-full" />

      <span className="text-[7px] leading-none mt-[2px]">🍻</span>
    </div>
  );
}

function Title({ title, subtitle }) {
  return <div className="min-w-0"><h2 className="text-xl md:text-3xl font-bold tracking-tight leading-tight">{title}</h2><p className="text-zinc-500 mt-1 text-sm md:text-base">{subtitle}</p></div>;
}

function Metric({ title, value, icon }) {
  return <Card className="rounded-3xl border-zinc-200 shadow-sm"><CardContent className="p-4 md:p-5"><div className="h-9 w-9 md:h-10 md:w-10 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3 md:mb-4"><Icon name={icon} /></div><p className="text-xs md:text-sm text-zinc-500">{title}</p><p className="text-xl md:text-2xl font-bold mt-1 break-words">{value}</p></CardContent></Card>;
}

function CardBox({ children }) {
  return <Card className="rounded-3xl border-zinc-200 shadow-sm overflow-hidden"><CardContent className="p-4 md:p-5 min-w-0">{children}</CardContent></Card>;
}

function Input({ label, value, onChange, type = "text", placeholder = "" }) {
  const focusKey = getStableFocusKey(label, placeholder, type);
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      <input
        data-focus-key={focusKey}
        type={type}
        value={value ?? ""}
        onChange={(event) => {
          keepInputFocused(event, focusKey);
          onChange?.(event.target.value);
        }}
        placeholder={placeholder}
        className="mt-1 w-full min-h-[48px] rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-950/20"
      />
    </label>
  );
}

function DarkInput({ label, value, onChange, type = "text", placeholder = "" }) {
  const focusKey = getStableFocusKey(label, placeholder, type);
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-300">{label}</span>
      <input
        data-focus-key={focusKey}
        type={type}
        value={value ?? ""}
        onChange={(event) => {
          keepInputFocused(event, focusKey);
          onChange?.(event.target.value);
        }}
        placeholder={placeholder}
        className="mt-1 w-full min-h-[48px] rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-base text-white outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-white/20"
      />
    </label>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  const focusKey = getStableFocusKey("Busca", placeholder, "search");
  return (
    <div className="bg-white rounded-3xl border border-zinc-200 px-4 py-2 flex items-center gap-3 shadow-sm">
      <Icon name="search" className="text-zinc-400" />
      <input
        data-focus-key={focusKey}
        value={value ?? ""}
        onChange={(event) => {
          keepInputFocused(event, focusKey);
          onChange?.(event.target.value);
        }}
        placeholder={placeholder}
        className="w-full outline-none bg-transparent"
      />
    </div>
  );
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Erro crítico capturado no aplicativo:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-zinc-950 text-white p-6 flex items-center justify-center">
          <div className="max-w-md rounded-3xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
            <h1 className="text-2xl font-black">O app encontrou um erro na tela.</h1>
            <p className="text-sm text-zinc-300">Atualize a página. O carrinho foi protegido para evitar tela branca, mas esta mensagem ajuda a não travar o cliente.</p>
            <pre className="text-xs whitespace-pre-wrap rounded-2xl bg-black/30 p-3 text-red-200">{String(this.state.error?.message || this.state.error)}</pre>
            <button onClick={() => { this.setState({ error: null }); window.location.reload(); }} className="w-full rounded-2xl bg-white px-4 py-3 font-black text-zinc-950">Recarregar aplicativo</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [isLogged, setIsLogged] = useState(false);
  const [storeSession, setStoreSession] = useState(null);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [failedStoreLoginAttempts, setFailedStoreLoginAttempts] = useState(0);
  const [storeLoginLockedUntil, setStoreLoginLockedUntil] = useState(null);
  const [courierLogin, setCourierLogin] = useState("");
  const [courierPassword, setCourierPassword] = useState("");
  const [courierLoginError, setCourierLoginError] = useState("");
  const [loggedCourier, setLoggedCourier] = useState(null);
  const [courierActionIds, setCourierActionIds] = useState({});
  const [entryMode, setEntryMode] = useState("customer");
  const [customerSubmitted, setCustomerSubmitted] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [customerForm, setCustomerForm] = useState({ name: "", phone: "", cep: "", street: "", number: "", district: "", city: "", state: "", reference: "" });
  const [customerProductSearch, setCustomerProductSearch] = useState("");
  const [customerCart, setCustomerCart] = useState([]);
  const [customerVariantPicker, setCustomerVariantPicker] = useState({ open: false, product: null, quantities: {} });
  const [showCustomerCheckout, setShowCustomerCheckout] = useState(false);
  const [showCustomerNeedMoreMessage, setShowCustomerNeedMoreMessage] = useState(false);
  const [customerPayment, setCustomerPayment] = useState("Pix");
  const [customerChangeFor, setCustomerChangeFor] = useState("");
  const [customerOrderConfirmation, setCustomerOrderConfirmation] = useState(null);
  const [customerSubmitting, setCustomerSubmitting] = useState(false);
  const [selectedCustomerGroup, setSelectedCustomerGroup] = useState("Todos");
  const [showCustomerPromo, setShowCustomerPromo] = useState(false);
  const [canCloseCustomerPromo, setCanCloseCustomerPromo] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [storeSettings, setStoreSettings] = useState(() => loadStoreSettingsFromLocalStorage());
  const [storeSettingsSyncReady, setStoreSettingsSyncReady] = useState(false);
  const [storeSettingsSyncStatus, setStoreSettingsSyncStatus] = useState("Carregando configurações...");
  const [showStoreScheduleModal, setShowStoreScheduleModal] = useState(false);
  const [currentStoreDate, setCurrentStoreDate] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;

    async function loadRemoteStoreSettings() {
      const { settings, error } = await loadStoreSettingsFromSupabaseService();
      if (cancelled) return;

      if (settings) {
        const sanitizedSettings = sanitizeStoreSettings(settings);
        setStoreSettings(sanitizedSettings);
        saveStoreSettingsToLocalStorage(sanitizedSettings);
        setDeliveryDraft((previousDraft) => ({ ...previousDraft, deliveryFee: sanitizedSettings.defaultDeliveryFee }));
        setStoreSettingsSyncStatus("Configurações carregadas do Supabase.");
      } else if (error) {
        setStoreSettingsSyncStatus("Usando configurações deste navegador. Crie a tabela store_settings para sincronizar no Supabase.");
      } else {
        setStoreSettingsSyncStatus("Configurações locais prontas. Salve uma alteração para sincronizar no Supabase.");
      }

      setStoreSettingsSyncReady(true);
    }

    loadRemoteStoreSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sanitizedSettings = sanitizeStoreSettings(storeSettings);
    saveStoreSettingsToLocalStorage(sanitizedSettings);

    if (!storeSettingsSyncReady) return undefined;

    const timer = window.setTimeout(async () => {
      const { error } = await saveStoreSettingsToSupabaseService(sanitizedSettings);
      setStoreSettingsSyncStatus(error ? "Configurações salvas neste navegador; Supabase não sincronizou." : "Configurações sincronizadas no Supabase.");
    }, 700);

    return () => window.clearTimeout(timer);
  }, [storeSettings, storeSettingsSyncReady]);
  const [products, setProducts] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [kits, setKits] = useState([]);
  const [clients, setClients] = useState(initialClients);
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [couriers, setCouriers] = useState([]);
  const [search, setSearch] = useState("");
  const [ownerPinOpen, setOwnerPinOpen] = useState(false);
  const [lastAction, setLastAction] = useState("");

  async function loadProducts() {
    const { products: formattedProducts, error } = await loadProductsFromSupabase();

    if (error) {
      console.error("Erro ao carregar produtos:", error);
      setProducts([]);
      setLastAction(`Erro ao carregar produtos do Supabase: ${error.message || "verifique URL, chave e policies."}`);
      return;
    }

    setProducts(formattedProducts);
    setLastAction("Produtos carregados do Supabase.");
  }

  async function loadClients() {
    const { clients: formattedClients, error } = await loadClientsFromSupabase();

    if (error) {
      console.error("Erro ao carregar clientes:", error);
      setLastAction(`Clientes não carregados do Supabase: ${error.message || "verifique SELECT em clients."}`);
      return;
    }

    setClients(formattedClients);
  }

  async function loadCouriers() {
    const { couriers: nextCouriers, error } = await loadCouriersFromSupabase();

    if (error) {
      console.error("Erro ao carregar entregadores:", error);
      setCouriers([]);
      setLastAction(`Entregadores não carregados do Supabase: ${error.message || "verifique SELECT em couriers."}`);
      return [];
    }

    setCouriers(nextCouriers);
    return nextCouriers;
  }

  async function loadPromotions() {
    const { data, error } = await supabase.from("promotions").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Erro ao carregar promoções:", error);
      setPromotions([]);
      return;
    }
    setPromotions((Array.isArray(data) ? data : []).map((promotion) => ({
      id: promotion.id,
      title: promotion.title || "",
      description: promotion.description || "",
      productId: promotion.product_id ?? promotion.productId ?? "",
      badge: promotion.badge || "Promoção da loja",
      imageUrl: promotion.image_url || promotion.imageUrl || "",
      discountPercent: Number(promotion.discount_percent ?? promotion.discountPercent ?? 0),
      promotionalPrice: Number(promotion.promotional_price ?? promotion.promotionalPrice ?? 0),
      startDate: promotion.start_date || promotion.startDate || "",
      endDate: promotion.end_date || promotion.endDate || "",
      createdAt: promotion.created_at || promotion.createdAt || "",
      updatedAt: promotion.updated_at || promotion.updatedAt || "",
      active: isTruthyActive(promotion.active),
    })));
  }

  async function loadKits() {
    const { data: kitData, error: kitError } = await supabase.from("kits").select("*");
    if (kitError) {
      console.error("Erro ao carregar kits:", kitError);
      setKits([]);
      return;
    }
    const { data: itemData, error: itemError } = await supabase.from("kit_items").select("*");
    if (itemError) {
      console.error("Erro ao carregar itens dos kits:", itemError);
      setKits((Array.isArray(kitData) ? kitData : []).map((kit) => ({ id: kit.id, name: kit.name || "", description: kit.description || "", items: [], price: Number(kit.price || 0), endDate: kit.end_date || kit.endDate || "", active: isTruthyActive(kit.active) })));
      return;
    }
    const itemsByKit = (Array.isArray(itemData) ? itemData : []).reduce((acc, item) => {
      const key = item.kit_id;
      if (!acc[key]) acc[key] = [];
      acc[key].push({ productId: item.product_id, quantity: Number(item.quantity || 1) });
      return acc;
    }, {});
    setKits((Array.isArray(kitData) ? kitData : []).map((kit) => ({
      id: kit.id,
      name: kit.name || "",
      description: kit.description || "",
      items: itemsByKit[kit.id] || [],
      price: Number(kit.price || 0),
      endDate: kit.end_date || kit.endDate || "",
      active: isTruthyActive(kit.active),
    })));
  }

  async function loadTabsAccounts() {
    const { tabs, error } = await loadTabsAccountsFromSupabase({
      defaultCreditLimit: DEFAULT_TAB_CREDIT_LIMIT,
    });

    if (error) {
      console.error("Erro ao carregar comandas:", error);
      setTabsAccounts([]);
      setLastAction(`Comandas não carregadas do Supabase: ${error.message || "verifique tabela/policy tab_accounts."}`);
      return;
    }

    setTabsAccounts(tabs || []);
  }


  async function persistTabAccount(tab, status = "open") {
    const { error } = await persistTabAccountInSupabase(tab, status, {
      defaultCreditLimit: DEFAULT_TAB_CREDIT_LIMIT,
      total: buildOrderTotal(tab.items || []),
      cashSessionId: tab.cashSessionId || cashSession.id || null,
      closedBy: getCurrentStoreUserName(),
    });

    if (error) throw new Error(error.message || "Não foi possível salvar comanda no Supabase.");
    return true;
  }


  async function loadCashData() {
    const { cashSession: nextCashSession, cashClosings: nextCashClosings, error } = await loadCashDataFromSupabase();

    if (error) {
      console.error("Erro ao carregar sessões de caixa:", error);
      setLastAction(`Caixa não carregado do Supabase: ${error.message || "verifique cash_sessions."}`);
      return;
    }

    setCashClosings(nextCashClosings || []);
    if (nextCashSession) setCashSession(nextCashSession);
  }


  async function fetchOrderPayments() {
    const { data, error } = await fetchOrderPaymentsFromSupabase();
    if (error) {
      console.error("Erro ao carregar pagamentos do caixa:", error);
      return [];
    }
    return data;
  }

  async function loadOrderPayments() {
    const rows = await fetchOrderPayments();
    setOrderPayments(rows);
    return rows;
  }

  async function loadNotifications() {
    const { data, error } = await loadNotificationsFromSupabase();
    if (error) {
      console.error("Erro ao carregar notificações:", error);
      return;
    }
    setNotifications(data);
  }

  async function saveNotificationToSupabase(notification) {
    const { error } = await saveNotificationToSupabaseService(notification);
    if (error) console.error("Notificação não salva no Supabase:", error);
  }

  async function auditAction(action, entity, entityId, afterJson = {}, beforeJson = null, userType = isLogged ? "store" : loggedCourier ? "courier" : "customer", userName = getCurrentStoreUserName?.() || loggedCourier?.username || customerForm.name || "sistema") {
    const { error } = await writeAuditLog({
      action,
      entity,
      entityId,
      afterJson,
      beforeJson,
      userType,
      userName,
    });
    if (error) console.error("Auditoria não salva:", error);
  }

  async function registerAppError(source, error, metadata = {}) {
    try {
      await writeAppError(source, error, metadata);
    } catch {
      // Falha de auditoria de erro não deve travar o fluxo principal.
    }
  }


  function mapStoreUserFromDatabase(row) {
    return {
      id: row.id,
      name: row.name || row.display_name || row.username || row.email || "Usuário da loja",
      username: normalizeStoreLogin(row.username || row.login || row.email),
      email: normalizeStoreLogin(row.email || ""),
      password: normalizeStoreCredential(row.password || row.password_text || row.password_hash || ""),
      role: row.role || "operador",
      active: isTruthyActive(row.active),
      createdAt: row.created_at || "",
    };
  }

  async function findStoreUserByLoginCredentials(inputLogin, inputPassword) {
    const normalizedLogin = normalizeStoreLogin(inputLogin);
    const normalizedPassword = normalizeStoreCredential(inputPassword);
    if (!normalizedLogin || !normalizedPassword) return { ok: false, unavailable: false, user: null };

    try {
      const { data, error } = await supabase.from("store_users").select("*").limit(100);
      if (error) {
        const message = String(error.message || "").toLowerCase();
        const storeUsersUnavailable = error.code === "42P01" || message.includes("store_users") || message.includes("does not exist") || message.includes("schema cache");
        if (storeUsersUnavailable) return { ok: false, unavailable: true, user: null };
        console.error("Erro ao validar login da loja em store_users:", error);
        await registerAppError("store_login", error, { login: normalizedLogin });
        return { ok: false, unavailable: false, user: null, error };
      }

      const user = (Array.isArray(data) ? data : [])
        .map(mapStoreUserFromDatabase)
        .find((storeUser) => {
          const loginMatches = storeUser.username === normalizedLogin || storeUser.email === normalizedLogin;
          return storeUser.active && loginMatches && storeUser.password === normalizedPassword;
        });

      return { ok: Boolean(user), unavailable: false, user: user || null };
    } catch (error) {
      console.error("Erro inesperado no login da loja:", error);
      await registerAppError("store_login", error, { login: normalizedLogin });
      return { ok: false, unavailable: false, user: null, error };
    }
  }

  function getCurrentStoreUserName() {
    return storeSession?.username || normalizeStoreLogin(login) || "loja";
  }

  function getCurrentStoreDisplayName() {
    return storeSession?.name || getCurrentStoreUserName();
  }

  function handleStoreLogout() {
    auditAction("store_logout", "store_session", storeSession?.id || getCurrentStoreUserName(), { username: getCurrentStoreUserName() }, null, "store", getCurrentStoreUserName());
    setIsLogged(false);
    setStoreSession(null);
    setPassword("");
    setLastAction("Sessão da loja encerrada com segurança.");
  }

  async function loadDeliveries() {
    const result = await loadDeliveriesFromSupabase();

    if (result.ordersError) {
      console.error("Erro ao carregar pedidos:", result.ordersError);
      setLastAction(
        `PDV Entregas não conseguiu ler a tabela orders: ${result.ordersError.message || "verifique a policy SELECT de orders no Supabase."}`
      );
      return;
    }

    if (result.itemsError) {
      console.error("Erro ao carregar itens dos pedidos:", result.itemsError);
      setDeliveries(result.data || []);
      setLastAction(
        `Pedidos carregados, mas os itens não foram lidos: ${result.itemsError.message || "verifique a policy SELECT de order_items."}`
      );
      return;
    }

    setDeliveries(result.data || []);
    setDeliveriesLoaded(true);
    console.log("PDV Entregas sincronizado:", result.counts || {});
  }

  async function saveDeliveryToSupabase(delivery) {
    const orderId = delivery.id;
    const { error: saveError, ignoredOrderColumns, ignoredItemColumns } = await insertOrderWithItemsInSupabase(
      delivery,
      delivery.cashSessionId || cashSession.id || null
    );

    if (saveError) {
      console.error("Erro ao salvar pedido no Supabase:", saveError);
      throw new Error(saveError.message || "Erro ao salvar pedido no Supabase.");
    }

    if (ignoredItemColumns.length > 0) {
      console.warn("Itens salvos ignorando colunas inexistentes:", ignoredItemColumns);
    }

    if (ignoredOrderColumns.length > 0) {
      console.warn("Pedido salvo ignorando colunas inexistentes:", ignoredOrderColumns);
    }

    const savedDelivery = { ...delivery, id: orderId };
    await saveOrderPayments(savedDelivery);
    await saveStockMovements(savedDelivery, "sale");
    await auditAction("save_order", "orders", orderId, { value: savedDelivery.value, status: savedDelivery.status, payment: savedDelivery.payment, cashSessionId: savedDelivery.cashSessionId || "" });

    return savedDelivery;
  }

  async function updateDeliveryInSupabase(id, patch) {
    const { error, ignoredColumns } = await updateOrderInSupabase(id, patch);

    if (error) {
      console.error("Erro ao atualizar pedido no Supabase:", error);
      setLastAction(`Pedido não foi atualizado no Supabase: ${error.message || "verifique policies de UPDATE."}`);
      return false;
    }

    if (ignoredColumns.length > 0) {
      console.warn("Pedido atualizado ignorando colunas inexistentes:", ignoredColumns);
    }

    return true;
  }

  function patchDeliveryLocally(id, patch) {
    setDeliveries((previousDeliveries) => previousDeliveries.map((delivery) => (String(delivery.id) === String(id) ? { ...delivery, ...patch } : delivery)));
  }

  async function updateDeliveryWhatsAppStatus(id, patch) {
    patchDeliveryLocally(id, patch);
    const updated = await updateDeliveryInSupabase(id, patch);
    return updated;
  }

  async function handleOpenCustomerWhatsApp(delivery) {
    if (!delivery?.phone || !onlyPhoneNumbers(delivery.phone)) {
      setLastAction("Este pedido não tem telefone válido para abrir o WhatsApp.");
      return;
    }
    const message = buildCustomerWhatsAppMessage(delivery, storeSettings);
    const url = buildWhatsAppUrl(delivery.phone, message);
    if (url === "#") {
      setLastAction("Telefone inválido para WhatsApp. Confira o cadastro do cliente.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    const now = new Date().toISOString();
    await updateDeliveryWhatsAppStatus(delivery.id, {
      whatsappStatus: "opened",
      whatsappOpenedAt: now,
      whatsappMessage: message,
    });
    setLastAction(`WhatsApp do pedido #${delivery.id} aberto com mensagem pronta. Depois de enviar, marque como enviado no pedido.`);
  }

  async function handleMarkCustomerWhatsAppSent(delivery) {
    if (!delivery) return;
    const now = new Date().toISOString();
    await updateDeliveryWhatsAppStatus(delivery.id, {
      whatsappStatus: "sent",
      whatsappSentAt: now,
      whatsappMessage: delivery.whatsappMessage || buildCustomerWhatsAppMessage(delivery, storeSettings),
    });
    setLastAction(`WhatsApp do pedido #${delivery.id} marcado como enviado.`);
  }

  async function handleCopyCustomerWhatsAppMessage(delivery) {
    if (!delivery) return;
    const message = buildCustomerWhatsAppMessage(delivery, storeSettings);
    try {
      await navigator.clipboard.writeText(message);
      setLastAction(`Mensagem do WhatsApp do pedido #${delivery.id} copiada.`);
    } catch {
      window.prompt("Copie a mensagem abaixo:", message);
      setLastAction(`Mensagem do WhatsApp do pedido #${delivery.id} aberta para copiar.`);
    }
  }

  async function saveOrderPayments(delivery) {
    const { rows, error } = await saveOrderPaymentsInSupabase(delivery, cashSession.id || null);
    if (error) throw new Error(error.message || "Pagamentos não foram salvos em order_payments.");

    setOrderPayments((previous) => [
      ...previous.map((payment) => String(payment.orderId) === String(delivery.id) ? { ...payment, status: "cancelled" } : payment),
      ...rows.map((row) => ({
        id: `${row.order_id}-${row.method}-${Date.now()}-${Math.random()}`,
        orderId: row.order_id,
        cashSessionId: row.cash_session_id || "",
        method: row.method,
        amount: Number(row.amount || 0),
        status: row.status || "paid",
        notes: row.notes || "",
        createdAt: new Date().toISOString(),
      }))
    ]);
    return true;
  }

  async function cancelExistingOrderPayments(orderId, reason = "substituído") {
    const { error } = await cancelExistingOrderPaymentsInSupabase(orderId, reason);
    if (error) console.warn("Pagamentos anteriores não foram cancelados:", error);
    return !error;
  }

  async function saveStockMovements(delivery, movementType = "sale") {
    const { error } = await saveStockMovementsInSupabase({
      delivery,
      movementType,
      products,
      cashSessionId: delivery.cashSessionId || cashSession.id || null,
      createdBy: getCurrentStoreUserName() || loggedCourier?.username || "sistema",
    });
    if (error) console.error("Movimentação de estoque não salva:", error);
    return !error;
  }

  async function persistProductStocks(nextProducts) {
    try {
      await Promise.all(
        nextProducts.map((product) =>
          supabase
            .from("products")
            .update({ stock: Number(product.stock || 0) })
            .eq("id", product.id)
        )
      );
    } catch (error) {
      console.error("Erro ao atualizar estoque no Supabase:", error);
    }
  }

  useEffect(() => {
    let isMounted = true;

    loadProducts();
    loadClients();
    loadCouriers();
    loadPromotions();
    loadKits();
    loadDeliveries();
    loadTabsAccounts();
    loadCashData();
    loadOrderPayments();
    loadNotifications();

    // Mantém o PDV Entregas sincronizado com pedidos feitos em outro celular/computador.
    // Antes o sistema carregava os pedidos só uma vez ao abrir a tela; por isso
    // pedidos de cliente podiam salvar no Supabase, mas não aparecer no painel aberto.
    const refreshDeliveries = () => {
      if (!isMounted) return;
      loadDeliveries();
    };

    const refreshInterval = window.setInterval(refreshDeliveries, 3000);

    const ordersChannel = supabase
      .channel("orders-pvd-entregas-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, refreshDeliveries)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, refreshDeliveries)
      .subscribe();

    const productsClientsChannel = supabase
      .channel("products-clients-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => { if (isMounted) loadProducts(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => { if (isMounted) loadClients(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "couriers" }, () => { if (isMounted) loadCouriers(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "promotions" }, () => { if (isMounted) loadPromotions(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "kits" }, () => { if (isMounted) loadKits(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "kit_items" }, () => { if (isMounted) loadKits(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "tab_accounts" }, () => { if (isMounted) loadTabsAccounts(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "cash_movements" }, () => { if (isMounted) loadCashData(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "cash_sessions" }, () => { if (isMounted) loadCashData(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "tab_account_items" }, () => { if (isMounted) loadTabsAccounts(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => { if (isMounted) loadNotifications(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_payments" }, () => { if (isMounted) loadOrderPayments(); })
      .subscribe();

    return () => {
      isMounted = false;
      window.clearInterval(refreshInterval);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(productsClientsChannel);
    };
  // Carregamento inicial intencional: as funções chamadas aqui não devem reiniciar os canais a cada render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentStoreDate(new Date()), 3000);
    return () => window.clearInterval(interval);
  }, []);

  const [deliveryProductSearch, setDeliveryProductSearch] = useState("");
  const [deliveryDraft, setDeliveryDraft] = useState(() => ({ clientId: "", payment: "Pix", changeFor: "", notes: "", items: [], deliveryFee: storeSettings.defaultDeliveryFee, discount: 0 }));
  const [counterProductSearch, setCounterProductSearch] = useState("");
  const [counterKitSearch, setCounterKitSearch] = useState("");
  const [counterDraft, setCounterDraft] = useState({ customerName: "Cliente balcão", phone: "", payment: "Pix", changeFor: "", notes: "", items: [], discount: 0 });
  const [newCourier, setNewCourier] = useState({ name: "", username: "", password: generateStrongPassword(), motorcycleType: "Moto própria" });
  const todayInput = getDateInputValue(new Date());
  const [newProduct, setNewProduct] = useState({ name: "", category: initialProductGroups[0], price: "", cost: "", stock: "", minStock: "", barcode: "", imageUrl: "", hasVariants: false, variants: [] });
  const [productGroups, setProductGroups] = useState(initialProductGroups);
  const [newProductGroup, setNewProductGroup] = useState("");
  const [newPromotion, setNewPromotion] = useState({ title: "", description: "", productId: "", badge: "Promoção da loja", imageUrl: "", discountPercent: "", promotionalPrice: "", startDate: "", endDate: "", active: true });
  const [promotionProductSearch, setPromotionProductSearch] = useState("");
  const [editingPromotionProductSearch, setEditingPromotionProductSearch] = useState("");
  const [editingPromotionId, setEditingPromotionId] = useState(null);
  const [kitProductSearch, setKitProductSearch] = useState("");
  const [pvdKitSearch, setPvdKitSearch] = useState("");
  const [editingKitProductSearch, setEditingKitProductSearch] = useState("");
  const [editingKitId, setEditingKitId] = useState(null);
  const [newKit, setNewKit] = useState({ name: "", description: "", items: [], price: "", endDate: "", active: true });
  const [newKitPriceEdited, setNewKitPriceEdited] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "", cep: "", street: "", number: "", district: "", city: "", state: "", reference: "" });
  const [clientSearch, setClientSearch] = useState("");
  const [editingClientId, setEditingClientId] = useState(null);
  const [courierSearch, setCourierSearch] = useState("");
  const [editingCourierId, setEditingCourierId] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [deliveriesLoaded, setDeliveriesLoaded] = useState(false);
  const knownDeliveryIdsRef = useRef(new Set());
  const autoPrintedDeliveryIdsRef = useRef(new Set());
  const autoPrintInitializedRef = useRef(false);
  const backupFileInputRef = useRef(null);
  const [orderPayments, setOrderPayments] = useState([]);
  const [processingPaymentIds, setProcessingPaymentIds] = useState([]);
  const [cashSession, setCashSession] = useState({ isOpen: false, id: "", openedAt: "", closedAt: "", openingAmount: 0, sangrias: [] });
  const [openingCashInput, setOpeningCashInput] = useState("");
  const [sangriaDraft, setSangriaDraft] = useState({ value: "", reason: "" });
  const [closingCashCounted, setClosingCashCounted] = useState("");
  const [tabsAccounts, setTabsAccounts] = useState([]);
  const [tabCreditLimits, setTabCreditLimits] = useState({});
  const [tabDraft, setTabDraft] = useState({ customerName: "", phone: "", creditLimit: DEFAULT_TAB_CREDIT_LIMIT });
  const [tabProductSearch, setTabProductSearch] = useState("");
  const [tabProductSearchByTab, setTabProductSearchByTab] = useState({});
  const [tabLimitDrafts, setTabLimitDrafts] = useState({});
  const [tabProductQuantityByTab, setTabProductQuantityByTab] = useState({});
  const [closingTabId, setClosingTabId] = useState(null);
  const [tabClosingPayment, setTabClosingPayment] = useState("Dinheiro");
  const [tabClosingChangeFor, setTabClosingChangeFor] = useState("");
  const [tabClosingMixedPayment, setTabClosingMixedPayment] = useState(createEmptyMixedPayment());
  const [tabClosingStorePassword, setTabClosingStorePassword] = useState("");
  const [pendingCancellation, setPendingCancellation] = useState({ open: false, deliveryId: null, reason: CANCELLATION_REASONS[0], details: "", orderType: ORDER_TYPE.DELIVERY });
  const [cashClosings, setCashClosings] = useState([]);
  const [reportRange, setReportRange] = useState({ startDate: todayInput.slice(0, 7) + "-01", endDate: todayInput });
  const isCashOpen = cashSession.isOpen === true;

  const normalizedStoreSchedule = useMemo(() => normalizeStoreSchedule(storeSettings.schedule), [storeSettings.schedule]);
  const storeOpenStatus = useMemo(() => getStoreOpenStatus(normalizedStoreSchedule, currentStoreDate), [normalizedStoreSchedule, currentStoreDate]);
  const effectiveStoreIsOpen = storeOpenStatus.isOpen;
  const storeOpeningHoursSummary = useMemo(() => buildOpeningHoursSummary(normalizedStoreSchedule), [normalizedStoreSchedule]);
  const currentEstimatedDeliveryMinutes = useMemo(() => buildEstimatedDeliveryMinutes(deliveries, false), [deliveries]);
  const nextOrderEstimatedDeliveryMinutes = useMemo(() => buildEstimatedDeliveryMinutes(deliveries, true), [deliveries]);
  const currentEstimatedDeliveryLabel = useMemo(() => formatEstimatedDeliveryTime(currentEstimatedDeliveryMinutes), [currentEstimatedDeliveryMinutes]);
  const nextOrderEstimatedDeliveryLabel = useMemo(() => formatEstimatedDeliveryTime(nextOrderEstimatedDeliveryMinutes), [nextOrderEstimatedDeliveryMinutes]);

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase();
    return products.filter((product) => {
      const searchable = `${product.name || ""} ${product.barcode || ""} ${product.category || ""}`.toLowerCase();
      return searchable.includes(term);
    });
  }, [products, search]);

  const deliveryProductResults = useMemo(() => {
    const availableProducts = getActiveProducts(products);
    const term = deliveryProductSearch.toLowerCase().trim();
    if (!term) return availableProducts;
    return availableProducts.filter((product) => {
      const searchable = `${product.name || ""} ${product.barcode || ""} ${product.category || ""}`.toLowerCase();
      return searchable.includes(term);
    });
  }, [products, deliveryProductSearch]);

  const customerProductResults = useMemo(() => {
    const availableProducts = getActiveProducts(products).filter((product) => {
      return selectedCustomerGroup === "Todos" || normalizeGroupName(product.category) === selectedCustomerGroup;
    });
    const term = customerProductSearch.toLowerCase().trim();
    if (!term) return availableProducts;
    return availableProducts.filter((product) => {
      const searchable = `${product.name || ""} ${product.category || ""} ${product.barcode || ""}`.toLowerCase();
      return searchable.includes(term);
    });
  }, [products, customerProductSearch, selectedCustomerGroup]);

  const visibleCustomerGroups = useMemo(() => getVisibleProductGroups(products, productGroups), [products, productGroups]);
  const groupedCustomerProducts = useMemo(() => groupProductsByCategory(customerProductResults, visibleCustomerGroups), [customerProductResults, visibleCustomerGroups]);
  const activeCustomerPromotions = useMemo(() => getActivePromotions(promotions, products), [promotions, products]);

  const filteredPromotionProducts = useMemo(() => {
    const term = promotionProductSearch.toLowerCase().trim();
    if (!term) return products;
    return products.filter((product) => {
      const searchable = `${product.name || ""} ${product.category || ""} ${product.barcode || ""}`.toLowerCase();
      return searchable.includes(term);
    });
  }, [products, promotionProductSearch]);

  const filteredEditingPromotionProducts = useMemo(() => {
    const term = editingPromotionProductSearch.toLowerCase().trim();
    if (!term) return products;
    return products.filter((product) => {
      const searchable = `${product.name || ""} ${product.category || ""} ${product.barcode || ""}`.toLowerCase();
      return searchable.includes(term);
    });
  }, [products, editingPromotionProductSearch]);

  const filteredKitProducts = useMemo(() => {
    const term = kitProductSearch.toLowerCase().trim();
    const availableProducts = getActiveProducts(products);
    if (!term) return availableProducts;
    return availableProducts.filter((product) => {
      const searchable = `${product.name || ""} ${product.category || ""} ${product.barcode || ""}`.toLowerCase();
      return searchable.includes(term);
    });
  }, [products, kitProductSearch]);

  const activeCustomerKits = useMemo(() => getActiveKits(kits, products), [kits, products]);
  const customerVisibleKits = useMemo(() => getCustomerVisibleKits(kits, products), [kits, products]);
  const pvdKitResults = useMemo(() => {
    const term = pvdKitSearch.toLowerCase().trim();
    if (!term) return activeCustomerKits;
    return activeCustomerKits.filter((kit) => `${kit.name || ""} ${kit.description || ""} ${describeKitItems(kit, products)}`.toLowerCase().includes(term));
  }, [activeCustomerKits, pvdKitSearch, products]);

  const counterProductResults = useMemo(() => {
    const availableProducts = getActiveProducts(products);
    const term = counterProductSearch.toLowerCase().trim();
    if (!term) return availableProducts;
    return availableProducts.filter((product) => `${product.name || ""} ${product.barcode || ""} ${product.category || ""}`.toLowerCase().includes(term));
  }, [products, counterProductSearch]);

  const counterKitResults = useMemo(() => {
    const term = counterKitSearch.toLowerCase().trim();
    if (!term) return activeCustomerKits;
    return activeCustomerKits.filter((kit) => `${kit.name || ""} ${kit.description || ""} ${describeKitItems(kit, products)}`.toLowerCase().includes(term));
  }, [activeCustomerKits, counterKitSearch, products]);
  const tabProductResults = useMemo(() => {
    const availableProducts = getActiveProducts(products);
    const term = tabProductSearch.toLowerCase().trim();
    if (!term) return availableProducts;
    return availableProducts.filter((product) => `${product.name || ""} ${product.barcode || ""} ${product.category || ""}`.toLowerCase().includes(term));
  }, [products, tabProductSearch]);
  const shouldShowCustomerProducts = selectedCustomerGroup !== "Kits";
  const newKitProductsTotal = useMemo(() => buildKitProductsTotal(newKit.items, products), [newKit.items, products]);

  const safeCustomerCart = useMemo(() => sanitizeCustomerCart(customerCart), [customerCart]);
  const customerCartTotal = useMemo(() => buildOrderTotal(safeCustomerCart), [safeCustomerCart]);
  const customerCartItemCount = useMemo(() => safeCustomerCart.reduce((sum, item) => sum + toPositiveInteger(item.quantity, 0), 0), [safeCustomerCart]);
  const customerDeliveryTotal = useMemo(() => buildDeliveryTotal(customerCartTotal, storeSettings.defaultDeliveryFee), [customerCartTotal, storeSettings.defaultDeliveryFee]);
  const normalizedCustomerPhoneForNotifications = useMemo(() => onlyPhoneNumbers(customerForm.phone), [customerForm.phone]);

  function getCustomerProductCartItems(productId) {
    return safeCustomerCart.filter((item) => item.isKit !== true && String(item.id) === String(productId));
  }

  function getCustomerProductCartQuantity(productId) {
    return getCustomerProductCartItems(productId).reduce((sum, item) => sum + toPositiveInteger(item.quantity, 0), 0);
  }

  function getCustomerProductCartSubtotal(productId) {
    return getCustomerProductCartItems(productId).reduce((sum, item) => sum + toSafeMoneyNumber(item.price, 0) * toPositiveInteger(item.quantity, 0), 0);
  }

  function decreaseCustomerProductCartQuantity(productId) {
    const firstCartItem = getCustomerProductCartItems(productId)[0];
    if (!firstCartItem) return;
    const currentQuantity = toPositiveInteger(firstCartItem.quantity, 1);
    if (currentQuantity <= 1) {
      removeCustomerCartItem(firstCartItem.cartKey || firstCartItem.id);
      return;
    }
    updateCustomerCartQuantity(firstCartItem.cartKey || firstCartItem.id, currentQuantity - 1);
  }

  function getCustomerKitCartQuantity(kitId) {
    return safeCustomerCart
      .filter((item) => item.isKit === true && String(item.kitId) === String(kitId))
      .reduce((sum, item) => sum + toPositiveInteger(item.quantity, 0), 0);
  }

  function getCustomerKitCartSubtotal(kitId) {
    return safeCustomerCart
      .filter((item) => item.isKit === true && String(item.kitId) === String(kitId))
      .reduce((sum, item) => sum + toSafeMoneyNumber(item.price, 0) * toPositiveInteger(item.quantity, 0), 0);
  }
  const filteredClients = useMemo(() => {
    const term = clientSearch.toLowerCase().trim();
    if (!term) return clients;
    return clients.filter((client) => {
      const searchable = `${client.name} ${client.phone} ${client.cep} ${client.street} ${client.number} ${client.district} ${client.city} ${client.state} ${client.reference}`.toLowerCase();
      return searchable.includes(term);
    });
  }, [clients, clientSearch]);

  const filteredCouriers = useMemo(() => {
    const term = courierSearch.toLowerCase().trim();
    if (!term) return couriers;
    return couriers.filter((courier) => {
      const statusText = courier.active ? "ativo" : "bloqueado";
      const searchable = [courier.name, courier.username, courier.motorcycleType, statusText].join(" ").toLowerCase();
      return searchable.includes(term);
    });
  }, [couriers, courierSearch]);

  const storeDeliverySummary = useMemo(() => buildStoreDeliveryFinancialSummary(deliveries), [deliveries]);
  const customerHistoryByClientId = useMemo(() => {
    return clients.reduce((acc, client) => {
      acc[client.id] = buildCustomerHistory(deliveries, client.phone);
      return acc;
    }, {});
  }, [clients, deliveries]);

  const selectedDeliveryClient = useMemo(() => clients.find((client) => String(client.id) === String(deliveryDraft.clientId)), [clients, deliveryDraft.clientId]);
  const deliveryDraftTotal = useMemo(() => buildOrderTotal(deliveryDraft.items), [deliveryDraft.items]);
  const counterDraftTotal = useMemo(() => buildOrderTotal(counterDraft.items), [counterDraft.items]);
  const counterDraftDiscount = normalizeDiscount(counterDraft.discount, counterDraftTotal);
  const counterDraftFinalTotal = useMemo(() => buildDiscountedProductsTotal(counterDraftTotal, counterDraftDiscount), [counterDraftTotal, counterDraftDiscount]);
  const deliveryDraftFee = normalizeDeliveryFee(deliveryDraft.deliveryFee);
  const deliveryDraftDiscount = normalizeDiscount(deliveryDraft.discount, deliveryDraftTotal);
  const deliveryDraftFinalTotal = useMemo(
    () => buildDeliveryTotal(deliveryDraftTotal, deliveryDraftFee, deliveryDraftDiscount),
    [deliveryDraftTotal, deliveryDraftFee, deliveryDraftDiscount]
  );
  const loggedCourierDeliveries = useMemo(() => (loggedCourier ? getCourierDeliveries(deliveries, loggedCourier.username) : []), [deliveries, loggedCourier]);
  const waitingPickupDeliveries = useMemo(() => loggedCourierDeliveries.filter((delivery) => delivery.status === DELIVERY_STATUS.WAITING_PICKUP), [loggedCourierDeliveries]);
  const courierPendingDeliveries = useMemo(() => loggedCourierDeliveries.filter((delivery) => delivery.status !== DELIVERY_STATUS.CONFIRMED_DELIVERED && delivery.status !== DELIVERY_STATUS.CANCELLED), [loggedCourierDeliveries]);
  const dayReport = useMemo(() => buildDayReport(products, deliveries), [products, deliveries]);
  const cashClosingReport = useMemo(() => buildCashClosingReport(deliveries, cashSession, orderPayments), [deliveries, cashSession, orderPayments]);
  const activeDeliveryOrdersForStore = useMemo(
    () => deliveries.filter((delivery) => isDeliveryOrder(delivery) && delivery.status !== DELIVERY_STATUS.CONFIRMED_DELIVERED && delivery.status !== DELIVERY_STATUS.CANCELLED),
    [deliveries]
  );
  const approvedDeliveryOrdersForStore = useMemo(
    () => deliveries.filter((delivery) => isDeliveryOrder(delivery) && delivery.status === DELIVERY_STATUS.CONFIRMED_DELIVERED && delivery.ownerApproved === true),
    [deliveries]
  );
  const approvedDeliveryReportForStore = useMemo(() => ({
    count: approvedDeliveryOrdersForStore.length,
    total: approvedDeliveryOrdersForStore.reduce((sum, delivery) => sum + Number(delivery.value || 0), 0),
    courierAmount: approvedDeliveryOrdersForStore.reduce((sum, delivery) => sum + Number(delivery.courierFee ?? calculateCourierFee(delivery.deliveryFee, delivery.motorcycleType)), 0),
    storeAmount: approvedDeliveryOrdersForStore.reduce((sum, delivery) => sum + Number(delivery.storeFee ?? calculateStoreFee(delivery.deliveryFee, delivery.motorcycleType)), 0),
  }), [approvedDeliveryOrdersForStore]);
  const selfTests = useMemo(() => runSelfTests(), []);
  const passedTests = selfTests.filter((test) => test.passed).length;
  const ownerNotifications = useMemo(() => getAudienceNotifications(notifications, "loja"), [notifications]);
  const courierNotifications = useMemo(() => getAudienceNotifications(notifications, "courier", loggedCourier?.username), [notifications, loggedCourier?.username]);
  const customerNotifications = useMemo(() => {
    if (!normalizedCustomerPhoneForNotifications) return [];
    return getAudienceNotifications(notifications, "customer").filter((notification) => {
      const notificationPhone = onlyPhoneNumbers(notification.customerPhone || notification.customer_phone);
      const relatedDelivery = deliveries.find((delivery) => String(delivery.id) === String(notification.orderId || notification.deliveryId));
      const relatedPhone = onlyPhoneNumbers(relatedDelivery?.phone || "");
      if (notificationPhone && notificationPhone !== normalizedCustomerPhoneForNotifications) return false;
      if (!notificationPhone && relatedPhone && relatedPhone !== normalizedCustomerPhoneForNotifications) return false;
      if (!notificationPhone && !relatedPhone) return false;
      return true;
    });
  }, [notifications, normalizedCustomerPhoneForNotifications, deliveries]);
  const ownerUnreadNotifications = useMemo(() => getUnreadNotificationCount(notifications, "loja"), [notifications]);
  const courierUnreadNotifications = useMemo(() => getUnreadNotificationCount(notifications, "courier", loggedCourier?.username), [notifications, loggedCourier?.username]);
  const periodSalesReport = useMemo(() => buildPeriodSalesReport(deliveries, reportRange.startDate, reportRange.endDate, orderPayments), [deliveries, reportRange, orderPayments]);
  const productSalesReport = useMemo(() => buildProductSalesReport(deliveries, reportRange.startDate, reportRange.endDate), [deliveries, reportRange]);
  const categorySalesReport = useMemo(() => buildCategorySalesReport(deliveries, products, reportRange.startDate, reportRange.endDate), [deliveries, products, reportRange]);
  const cancelledDeliveryOrdersForStore = useMemo(() => deliveries.filter((delivery) => isDeliveryOrder(delivery) && delivery.status === DELIVERY_STATUS.CANCELLED), [deliveries]);
  const cancelledDeliveryReportForStore = useMemo(() => ({
    count: cancelledDeliveryOrdersForStore.length,
    total: cancelledDeliveryOrdersForStore.reduce((sum, delivery) => sum + Number(delivery.value || 0), 0),
  }), [cancelledDeliveryOrdersForStore]);

  useEffect(() => {
    if (!showCustomerPromo) return;
    setCanCloseCustomerPromo(false);
    const timer = window.setTimeout(() => setCanCloseCustomerPromo(true), 3000);
    return () => window.clearTimeout(timer);
  }, [showCustomerPromo]);

  function addNotification(type, title, message, audience = "loja", deliveryId = null, options = {}) {
    const relatedDelivery = deliveries.find((delivery) => String(delivery.id) === String(deliveryId));
    const normalizedCustomerPhone = onlyPhoneNumbers(options.customerPhone || relatedDelivery?.phone || (normalizeNotificationAudience(audience) === "customer" ? customerForm.phone : ""));
    const notification = createNotification(type, title, message, audience, deliveryId, { ...options, customerPhone: normalizedCustomerPhone });
    setNotifications((previousNotifications) => [notification, ...previousNotifications]);
    saveNotificationToSupabase(notification);
    try {
      if (notification.audience === "loja" || notification.audience === "courier") {
        const audio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=");
        audio.play().catch(() => {});
      }
      if (notification.audience === "courier" && navigator.vibrate) navigator.vibrate([160, 80, 160]);
    } catch {
      // Alertas sonoros e vibração são recursos opcionais do navegador.
    }
  }

  async function markNotificationsRead(audience, courierUsername = "", customerPhone = "") {
    const normalizedAudience = normalizeNotificationAudience(audience);
    const normalizedCourierUsername = String(courierUsername || "").trim().toLowerCase();
    const normalizedCustomerPhone = onlyPhoneNumbers(customerPhone);
    const readAt = new Date().toISOString();

    setNotifications((previousNotifications) =>
      previousNotifications.map((notification) => {
        const notificationAudience = normalizeNotificationAudience(notification.audience);
        const notificationCourierUsername = String(notification.courierUsername || notification.courier_username || "").trim().toLowerCase();
        const notificationCustomerPhone = onlyPhoneNumbers(notification.customerPhone || notification.customer_phone);
        const isSameAudience = notificationAudience === normalizedAudience;
        const isSameCourier = normalizedAudience !== "courier" || !normalizedCourierUsername || !notificationCourierUsername || notificationCourierUsername === normalizedCourierUsername;
        const isSameCustomer = normalizedAudience !== "customer" || !normalizedCustomerPhone || notificationCustomerPhone === normalizedCustomerPhone;
        return isSameAudience && isSameCourier && isSameCustomer ? { ...notification, read: true, readAt, resolvedAt: readAt } : notification;
      })
    );

    let query = supabase.from("notifications").update({ read: true, read_at: readAt, resolved_at: readAt }).eq("audience", normalizedAudience);
    if (normalizedAudience === "courier" && normalizedCourierUsername) query = query.or(`courier_username.is.null,courier_username.eq.${normalizedCourierUsername}`);
    if (normalizedAudience === "customer" && normalizedCustomerPhone) query = query.eq("customer_phone", normalizedCustomerPhone);
    await query;
  }

  async function resolveOrderNotifications(deliveryId, audiences = ["loja", "courier", "customer"]) {
    const resolvedAt = new Date().toISOString();
    const normalizedAudiences = audiences.map((audience) => normalizeNotificationAudience(audience));

    setNotifications((previousNotifications) =>
      previousNotifications.map((notification) => {
        const notificationOrderId = String(notification.orderId || notification.deliveryId || "");
        const notificationAudience = normalizeNotificationAudience(notification.audience);
        if (notificationOrderId !== String(deliveryId) || !normalizedAudiences.includes(notificationAudience)) return notification;
        return { ...notification, read: true, readAt: notification.readAt || resolvedAt, resolvedAt };
      })
    );

    await supabase
      .from("notifications")
      .update({ read: true, read_at: resolvedAt, resolved_at: resolvedAt })
      .eq("order_id", deliveryId)
      .in("audience", normalizedAudiences);
  }

  async function handleLogin(event) {
    event.preventDefault();
    const normalizedLogin = normalizeStoreLogin(login);
    const normalizedPassword = normalizeStoreCredential(password);

    if (isStoreLoginLocked(storeLoginLockedUntil)) {
      return setLoginError(getStoreLockMessage(storeLoginLockedUntil));
    }

    if (!normalizedLogin || !normalizedPassword) return setLoginError("Preencha usuário/e-mail e senha da loja.");

    const storeUserResult = await findStoreUserByLoginCredentials(normalizedLogin, normalizedPassword);
    const legacyFallbackAllowed = storeUserResult.unavailable && isValidLogin(normalizedLogin, normalizedPassword);

    if (storeUserResult.ok || legacyFallbackAllowed) {
      const sessionUser = storeUserResult.user || {
        id: "legacy-store-login",
        name: normalizedLogin === "gabrieladmin" ? "Administrador da loja" : "Loja",
        username: normalizedLogin,
        email: "",
        role: normalizedLogin === "gabrieladmin" ? "admin" : "operador",
        active: true,
      };

      setStoreSession({ ...sessionUser, loggedAt: new Date().toISOString(), mode: storeUserResult.ok ? "supabase" : "legacy" });
      setIsLogged(true);
      setLoginError("");
      setFailedStoreLoginAttempts(0);
      setStoreLoginLockedUntil(null);
      setLastAction(storeUserResult.ok ? "Login da loja validado no Supabase." : "Login legado usado. Crie a tabela store_users para ativar controle profissional de usuários.");
      await auditAction("store_login_success", "store_session", sessionUser.id || sessionUser.username, { username: sessionUser.username, role: sessionUser.role, mode: storeUserResult.ok ? "supabase" : "legacy" }, null, "store", sessionUser.username);
      return;
    }

    const nextAttempts = failedStoreLoginAttempts + 1;
    setFailedStoreLoginAttempts(nextAttempts);
    await auditAction("store_login_failed", "store_session", normalizedLogin, { username: normalizedLogin, attempts: nextAttempts }, null, "store", normalizedLogin);

    if (nextAttempts >= 5) {
      const lockedUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      setStoreLoginLockedUntil(lockedUntil);
      setFailedStoreLoginAttempts(0);
      return setLoginError(getStoreLockMessage(lockedUntil));
    }

    setLoginError(`Dados inválidos. Tentativa ${nextAttempts}/5 antes do bloqueio temporário.`);
  }

  async function handleCourierLogin(event) {
    event.preventDefault();
    if (!courierLogin.trim() || !courierPassword.trim()) return setCourierLoginError("Preencha usuário e senha do entregador.");

    let courier = findCourierByLogin(couriers, courierLogin, courierPassword);
    if (!courier) {
      const latestCouriers = await loadCouriers();
      courier = findCourierByLogin(latestCouriers || [], courierLogin, courierPassword);
    }

    if (courier) {
      setCourierLoginError("");
      setLoggedCourier(courier);
      setCourierPassword("");
      return;
    }
    setCourierLoginError("Usuário ou senha do entregador inválidos, ou entregador inativo. Confira se a loja salvou o entregador.");
  }

  async function searchCustomerCep() {
    const cepNumbers = onlyCepNumbers(customerForm.cep);
    if (!isValidCep(customerForm.cep)) return setCustomerError("CEP inválido. Digite 8 números, por exemplo: 86610-000.");
    setCustomerError("Buscando endereço pelo CEP...");
    try {
      const response = await fetch("https://viacep.com.br/ws/" + cepNumbers + "/json/");
      const data = await response.json();
      if (!response.ok || data.erro) return setCustomerError("CEP não encontrado. Confira o número digitado ou preencha manualmente.");
      setCustomerForm((previousForm) => ({ ...previousForm, cep: formatCep(cepNumbers), street: data.logradouro || previousForm.street, district: data.bairro || previousForm.district, city: data.localidade || previousForm.city, state: data.uf || previousForm.state }));
      setCustomerError("Endereço encontrado. Confira rua, número e bairro antes de continuar.");
    } catch {
      setCustomerError("Não foi possível consultar o CEP agora. Preencha o endereço manualmente.");
    }
  }

  function submitCustomerForm(event) {
    event.preventDefault();
    if (!isCustomerFormComplete(customerForm)) return setCustomerError("Preencha nome, telefone, CEP válido, endereço, número da casa, bairro, cidade e estado.");
    if (customerForm.phone && !isValidBrazilMobilePhone(customerForm.phone)) return setCustomerError("Telefone inválido. Use DDD + 9 + 8 dígitos. Exemplo: (43) 98873-6791.");
    setCustomerForm((previousForm) => ({ ...previousForm, cep: formatCep(previousForm.cep), phone: previousForm.phone ? formatBrazilMobilePhone(previousForm.phone) : "" }));
    setCustomerSubmitted(true);
    setCustomerOrderConfirmation(null);
    setShowCustomerPromo(true);
    setCustomerError("");
  }

  function handleProductImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setNewProduct((previousProduct) => ({ ...previousProduct, imageUrl: String(reader.result || "") }));
      setLastAction("Imagem do produto carregada. " + formatProductImageHelp());
    };
    reader.readAsDataURL(file);
  }

  function addNewProductVariant() {
    setNewProduct((previousProduct) => ({
      ...previousProduct,
      hasVariants: true,
      variants: [...normalizeProductVariants(previousProduct.variants), { id: Date.now(), name: "", imageUrl: "", active: true }],
    }));
  }

  function updateNewProductVariant(variantId, field, value) {
    setNewProduct((previousProduct) => ({
      ...previousProduct,
      variants: normalizeProductVariants(previousProduct.variants).map((variant) => (String(variant.id) === String(variantId) ? { ...variant, [field]: value } : variant)),
    }));
  }

  function removeNewProductVariant(variantId) {
    setNewProduct((previousProduct) => ({
      ...previousProduct,
      variants: normalizeProductVariants(previousProduct.variants).filter((variant) => String(variant.id) !== String(variantId)),
    }));
  }

  function handleNewProductVariantImageUpload(variantId, event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateNewProductVariant(variantId, "imageUrl", String(reader.result || ""));
      setLastAction("Foto do sabor carregada.");
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  function addExistingProductVariant(productId) {
    setProducts((previousProducts) => previousProducts.map((product) => (
      product.id === productId
        ? { ...product, hasVariants: true, variants: [...normalizeProductVariants(product.variants), { id: Date.now(), name: "", imageUrl: "", active: true }] }
        : product
    )));
  }

  function updateExistingProductVariant(productId, variantId, field, value) {
    setProducts((previousProducts) => previousProducts.map((product) => (
      product.id === productId
        ? { ...product, variants: normalizeProductVariants(product.variants).map((variant) => (String(variant.id) === String(variantId) ? { ...variant, [field]: value } : variant)) }
        : product
    )));
  }

  function removeExistingProductVariant(productId, variantId) {
    setProducts((previousProducts) => previousProducts.map((product) => (
      product.id === productId
        ? { ...product, variants: normalizeProductVariants(product.variants).filter((variant) => String(variant.id) !== String(variantId)) }
        : product
    )));
  }

  function handleExistingProductVariantImageUpload(productId, variantId, event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateExistingProductVariant(productId, variantId, "imageUrl", String(reader.result || ""));
      setLastAction("Foto do sabor carregada. Clique em Salvar alterações para gravar.");
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  async function saveProductImage(id, imageUrl, successMessage = "Foto do produto atualizada com sucesso.") {
    const { error } = await updateProductImageInSupabase(id, imageUrl || "");
    if (error) {
      console.error("Erro ao atualizar foto do produto:", error);
      setLastAction(`Foto não salva no Supabase: ${error.message || "verifique policies de UPDATE em products."}`);
      return false;
    }

    setProducts((previousProducts) => previousProducts.map((product) => (product.id === id ? { ...product, imageUrl: imageUrl || "" } : product)));
    setLastAction(successMessage);
    return true;
  }

  function handleExistingProductImageUpload(id, event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const imageUrl = String(reader.result || "");
      await saveProductImage(id, imageUrl, "Foto do produto alterada e salva no Supabase.");
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  async function removeExistingProductImage(id) {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    if (!product.imageUrl) return setLastAction("Este produto já está sem foto.");
    const confirmed = window.confirm(`Remover a foto do produto "${product.name}"?`);
    if (!confirmed) return;
    await saveProductImage(id, "", "Foto do produto removida com sucesso.");
  }

  function addProductGroup() {
    const groupName = normalizeGroupName(newProductGroup);
    if (!groupName) return setLastAction("Digite o nome do grupo antes de adicionar.");
    if (hasDuplicateGroup(productGroups, groupName)) return setLastAction("Esse grupo já existe.");
    setProductGroups((previousGroups) => [...previousGroups, groupName]);
    setNewProductGroup("");
    setLastAction("Grupo de produtos criado com sucesso.");
  }

  async function addPromotion() {
    if (!newPromotion.title.trim()) return setLastAction("Digite o título da promoção.");
    if (!newPromotion.productId) return setLastAction("Selecione o produto da promoção.");
    const product = products.find((item) => Number(item.id) === Number(newPromotion.productId));
    if (!product) return setLastAction("Produto da promoção não encontrado.");
    const discountPercent = toNonNegativeNumber(newPromotion.discountPercent, 0);
    const typedPromotionalPrice = toNonNegativeNumber(newPromotion.promotionalPrice, 0);
    const promotionalPrice = typedPromotionalPrice > 0 ? typedPromotionalPrice : calculatePromotionFromPercent(product.price, discountPercent);
    if (!(promotionalPrice > 0) || promotionalPrice >= toNonNegativeNumber(product.price, 0)) return setLastAction("Informe uma porcentagem de desconto ou preço promocional menor que o preço normal.");

    const promotionToSave = {
      id: Date.now(),
      title: newPromotion.title.trim(),
      description: newPromotion.description.trim(),
      productId: Number(newPromotion.productId),
      badge: newPromotion.badge.trim() || "Promoção da loja",
      imageUrl: newPromotion.imageUrl,
      discountPercent,
      promotionalPrice,
      startDate: newPromotion.startDate,
      endDate: newPromotion.endDate,
      active: true,
    };
    const { error } = await insertWithSchemaRetry("promotions", { id: promotionToSave.id, title: promotionToSave.title, description: promotionToSave.description, product_id: promotionToSave.productId, badge: promotionToSave.badge, image_url: promotionToSave.imageUrl, discount_percent: promotionToSave.discountPercent, promotional_price: promotionToSave.promotionalPrice, start_date: promotionToSave.startDate || null, end_date: promotionToSave.endDate || null, active: true }, false);
    if (error) return setLastAction(`Promoção não salva no Supabase: ${error.message || "verifique promotions."}`);
    setPromotions((previousPromotions) => [...previousPromotions, promotionToSave]);
    setNewPromotion({ title: "", description: "", productId: "", badge: "Promoção da loja", imageUrl: "", discountPercent: "", promotionalPrice: "", startDate: "", endDate: "", active: true });
    setLastAction(`Promoção cadastrada no Supabase: ${product.name} de ${money(product.price)} por ${money(promotionalPrice)}.`);
  }

  async function togglePromotionStatus(id) {
    const promotion = promotions.find((item) => item.id === id);
    if (!promotion) return;
    const nextActive = !promotion.active;
    const { error } = await updateWithSchemaRetry("promotions", id, { active: nextActive });
    if (error) return setLastAction(`Status da promoção não salvo no Supabase: ${error.message || "verifique promotions."}`);
    setPromotions((previousPromotions) => previousPromotions.map((item) => (item.id === id ? { ...item, active: nextActive } : item)));
    setLastAction("Status da promoção atualizado no Supabase.");
  }

  function updatePromotionField(id, field, value) {
    const finalValue = field === "productId" ? (value === "" ? "" : Number(value)) : value;
    setPromotions((previousPromotions) => previousPromotions.map((promotion) => (promotion.id === id ? { ...promotion, [field]: finalValue } : promotion)));
  }

  async function savePromotionEdits(id) {
    const promotion = promotions.find((item) => item.id === id);
    if (!promotion) return;
    if (!promotion.title.trim()) return setLastAction("Promoção não salva: informe a chamada da promoção.");
    if (!promotion.productId) return setLastAction("Promoção não salva: vincule um produto.");
    const product = products.find((item) => Number(item.id) === Number(promotion.productId));
    if (!product) return setLastAction("Promoção não salva: produto não encontrado.");
    const promotionPrice = getPromotionPrice(product, promotion);
    if (!(promotionPrice > 0) || promotionPrice >= Number(product.price || 0)) return setLastAction("Promoção não salva: informe desconto ou preço menor que o normal.");
    const { error } = await updateWithSchemaRetry("promotions", id, { title: promotion.title, description: promotion.description, product_id: promotion.productId, badge: promotion.badge, image_url: promotion.imageUrl, discount_percent: promotion.discountPercent, promotional_price: getPromotionPrice(product, promotion), start_date: promotion.startDate || null, end_date: promotion.endDate || null, active: promotion.active });
    if (error) return setLastAction(`Promoção não salva no Supabase: ${error.message || "verifique promotions."}`);
    setEditingPromotionId(null);
    setLastAction("Promoção atualizada no Supabase.");
  }

  function handlePromotionImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setNewPromotion((previousPromotion) => ({ ...previousPromotion, imageUrl: String(reader.result || "") }));
      setLastAction("Imagem da promoção carregada. Formato recomendado: 1080 x 1350 px.");
    };
    reader.readAsDataURL(file);
  }

  function removePromotionImage() {
    setNewPromotion((previousPromotion) => ({ ...previousPromotion, imageUrl: "" }));
    setLastAction("Imagem removida da nova promoção.");
  }

  function handleExistingPromotionImageUpload(id, event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      updatePromotionField(id, "imageUrl", String(reader.result || ""));
      setLastAction("Imagem da promoção atualizada. Formato recomendado: 1080 x 1350 px.");
    };
    reader.readAsDataURL(file);
  }

  function goToPromotionProduct(promotion) {
    const product = getPromotionProduct(products, promotion);
    if (!product) return;
    setShowCustomerPromo(false);
    setSelectedCustomerGroup(product.category || "Todos");
    setCustomerProductSearch(product.name);
  }

  function addProductToNewKit(product) {
    setNewKit((previousKit) => {
      const existingItem = previousKit.items.find((item) => Number(item.productId) === product.id);
      const nextItems = existingItem
        ? previousKit.items.map((item) => (Number(item.productId) === product.id ? { ...item, quantity: Number(item.quantity || 0) + 1 } : item))
        : [...previousKit.items, { productId: product.id, quantity: 1 }];
      const autoTotal = buildKitProductsTotal(nextItems, products);
      return { ...previousKit, items: nextItems, price: newKitPriceEdited ? previousKit.price : autoTotal };
    });
  }

  function updateNewKitItemQuantity(productId, quantity) {
    const safeQuantity = Math.max(1, Number(quantity || 1));
    setNewKit((previousKit) => {
      const nextItems = previousKit.items.map((item) => (Number(item.productId) === Number(productId) ? { ...item, quantity: safeQuantity } : item));
      return { ...previousKit, items: nextItems, price: newKitPriceEdited ? previousKit.price : buildKitProductsTotal(nextItems, products) };
    });
  }

  function removeNewKitItem(productId) {
    setNewKit((previousKit) => {
      const nextItems = previousKit.items.filter((item) => Number(item.productId) !== Number(productId));
      return { ...previousKit, items: nextItems, price: newKitPriceEdited ? previousKit.price : buildKitProductsTotal(nextItems, products) };
    });
  }

  async function addKit() {
    if (!newKit.name.trim()) return setLastAction("Digite o nome do kit.");
    if (newKit.items.length === 0) return setLastAction("Adicione produtos cadastrados para montar o kit.");
    const baseTotal = buildKitProductsTotal(newKit.items, products);
    const finalPrice = newKit.price === "" ? baseTotal : Number(newKit.price || 0);
    const kitToSave = { id: Date.now(), name: newKit.name.trim(), description: newKit.description.trim(), items: newKit.items, price: finalPrice, endDate: newKit.endDate, active: true };
    const { error: kitError } = await insertWithSchemaRetry("kits", { id: kitToSave.id, name: kitToSave.name, description: kitToSave.description, price: kitToSave.price, end_date: kitToSave.endDate || null, active: true }, false);
    if (kitError) return setLastAction(`Kit não salvo no Supabase: ${kitError.message || "verifique kits."}`);
    const { error: kitItemsError } = await insertWithSchemaRetry("kit_items", kitToSave.items.map((item) => ({ id: Date.now() + Math.floor(Math.random() * 1000000), kit_id: kitToSave.id, product_id: item.productId, quantity: item.quantity })), false);
    if (kitItemsError) return setLastAction(`Itens do kit não salvos no Supabase: ${kitItemsError.message || "verifique kit_items."}`);
    setKits((previousKits) => [...previousKits, kitToSave]);
    setNewKit({ name: "", description: "", items: [], price: "", endDate: "", active: true });
    setNewKitPriceEdited(false);
    setKitProductSearch("");
    setLastAction("Kit cadastrado com sucesso.");
  }

  async function toggleKitStatus(id) {
    const kit = kits.find((item) => item.id === id);
    if (!kit) return;
    const nextActive = !kit.active;
    const { error } = await updateWithSchemaRetry("kits", id, { active: nextActive });
    if (error) return setLastAction(`Status do kit não salvo no Supabase: ${error.message || "verifique kits."}`);
    setKits((previousKits) => previousKits.map((item) => (item.id === id ? { ...item, active: nextActive } : item)));
    setLastAction("Status do kit atualizado no Supabase.");
  }

  function updateKitField(id, field, value) {
    const finalValue = field === "price" ? (value === "" ? "" : Number(value || 0)) : value;
    setKits((previousKits) => previousKits.map((kit) => (kit.id === id ? { ...kit, [field]: finalValue } : kit)));
  }

  function addProductToExistingKit(kitId, product) {
    setKits((previousKits) => previousKits.map((kit) => {
      if (kit.id !== kitId) return kit;
      const existingItem = (kit.items || []).find((item) => Number(item.productId) === product.id);
      const nextItems = existingItem
        ? (kit.items || []).map((item) => (Number(item.productId) === product.id ? { ...item, quantity: Number(item.quantity || 0) + 1 } : item))
        : [...(kit.items || []), { productId: product.id, quantity: 1 }];
      return { ...kit, items: nextItems };
    }));
  }

  function updateExistingKitItemQuantity(kitId, productId, quantity) {
    const safeQuantity = Math.max(1, Number(quantity || 1));
    setKits((previousKits) => previousKits.map((kit) =>
      kit.id === kitId ? { ...kit, items: (kit.items || []).map((item) => (Number(item.productId) === Number(productId) ? { ...item, quantity: safeQuantity } : item)) } : kit
    ));
  }

  function removeExistingKitItem(kitId, productId) {
    setKits((previousKits) => previousKits.map((kit) =>
      kit.id === kitId ? { ...kit, items: (kit.items || []).filter((item) => Number(item.productId) !== Number(productId)) } : kit
    ));
  }

  function saveKitEdits(id) {
    const kit = kits.find((item) => item.id === id);
    if (!kit) return;
    if (!kit.name.trim()) return setLastAction("Kit não salvo: informe o nome.");
    if (!kit.items || kit.items.length === 0) return setLastAction("Kit não salvo: adicione produtos cadastrados.");
    setEditingKitId(null);
    setLastAction("Kit atualizado com sucesso.");
  }

  function addKitToCustomerCart(kit) {
    setShowCustomerCheckout(false);
    setShowCustomerNeedMoreMessage(false);
    setCustomerOrderConfirmation(null);
    if (!kit || !Array.isArray(kit.items) || kit.items.length === 0) return setCustomerError("Kit indisponível no momento.");
    const kitItems = getKitItemsForOrder(kit, products).filter((item) => item.id !== undefined && item.id !== null && toPositiveInteger(item.quantity, 0) > 0);
    if (kitItems.length === 0 || kitItems.length !== kit.items.length) return setCustomerError("Kit com produto indisponível ou sem estoque. Revise o cadastro do kit na loja.");
    const kitPrice = toSafeMoneyNumber(kit.price || buildKitProductsTotal(kit.items, products), 0);

    setCustomerCart((previousCart) => {
      const currentCart = sanitizeCustomerCart(previousCart);
      const nextCart = [...currentCart, { id: `kit-${kit.id}-${Date.now()}`, name: kit.name || "Kit", price: kitPrice, quantity: 1, barcode: "KIT", isKit: true, kitId: kit.id, kitItems, cartKey: `kit-${kit.id}-${Date.now()}-${Math.random().toString(36).slice(2)}` }];
      const validation = validateOrderItems(nextCart, products);
      if (!validation.valid) {
        setCustomerError(validation.message);
        return currentCart;
      }
      setCustomerError(`${kit.name || "Kit"} adicionado ao pedido.`);
      return nextCart;
    });
  }

  function addKitToDelivery(kit) {
    const kitItems = getKitItemsForOrder(kit, products);
    setDeliveryDraft((previousDraft) => {
      const nextItems = [...previousDraft.items, { id: `kit-${kit.id}-${Date.now()}`, name: kit.name, price: Number(kit.price || buildKitProductsTotal(kit.items, products)), quantity: 1, barcode: "KIT", isKit: true, kitId: kit.id, kitItems }];
      const validation = validateOrderItems(nextItems, products);
      if (!validation.valid) {
        setLastAction(validation.message);
        return previousDraft;
      }
      setLastAction(kit.name + " adicionado ao pedido.");
      return { ...previousDraft, items: nextItems };
    });
  }

  async function addProduct() {
    const barcode = normalizeBarcode(newProduct.barcode);
    if (!newProduct.name || !newProduct.price || !barcode) return setLastAction("Produto não salvo: nome, preço e código de barras são obrigatórios.");
    if (!normalizeGroupName(newProduct.category)) return setLastAction("Selecione um grupo para o produto.");
    if (hasDuplicateBarcode(products, barcode)) return setLastAction("Código de barras já cadastrado em outro produto.");
    const cleanVariants = normalizeProductVariants(newProduct.variants);
    if (newProduct.hasVariants && cleanVariants.length === 0) return setLastAction("Adicione pelo menos um sabor antes de cadastrar este produto.");

    const productId = Date.now();
    const productToInsert = buildProductInsertPayload({ ...newProduct, variants: cleanVariants }, productId);

    // Importante: não usamos .select().single() aqui.
    // Algumas policies permitem INSERT público, mas bloqueiam SELECT no retorno.
    // Isso fazia o produto parecer que "não salvou", mesmo quando o INSERT podia ter passado.
    const { error, ignoredColumns } = await insertProductInSupabase(productToInsert);

    if (error) {
      console.error("Erro ao cadastrar produto no Supabase:", error);
      return setLastAction(`Produto não salvo no Supabase: ${error.message || "verifique RLS/policies de INSERT em products."}`);
    }

    const savedProduct = mapProductFromDatabase(productToInsert);

    setProducts((previousProducts) => [...previousProducts, savedProduct]);
    setNewProduct({ name: "", category: productGroups[0] || "", price: "", cost: "", stock: "", minStock: "", barcode: "", imageUrl: "", hasVariants: false, variants: [] });
    await loadProducts();
    setLastAction(ignoredColumns.length > 0 ? `Produto cadastrado no Supabase. Colunas ignoradas: ${ignoredColumns.join(", ")}.` : "Produto cadastrado com sucesso no Supabase.");
  }

  async function addClient() {
    if (!newClient.name || !newClient.phone || !newClient.cep || !newClient.street || !newClient.number || !newClient.district || !newClient.city || !newClient.state) return setLastAction("Cliente não salvo: nome, telefone, CEP, rua, número, bairro, cidade e estado são obrigatórios.");
    if (!isValidCep(newClient.cep)) return setLastAction("Cliente não salvo: CEP inválido. Digite 8 números.");
    if (!isValidBrazilMobilePhone(newClient.phone)) return setLastAction("Telefone inválido. Use DDD entre parênteses + número 9 obrigatório. Exemplo: (43) 98873-6791.");
    if (hasDuplicateClientRecord(clients, newClient)) return setLastAction("Cliente não salvo: já existe cadastro com esse telefone.");

    const clientToInsert = mapClientToDatabase({ id: Date.now(), ...newClient });
    const { error, ignoredColumns } = await insertClientInSupabase(clientToInsert);

    if (error) {
      console.error("Erro ao cadastrar cliente no Supabase:", error);
      return setLastAction(`Cliente não salvo no Supabase: ${error.message || "verifique RLS/policies de INSERT em clients."}`);
    }

    setClients((previousClients) => [...previousClients, mapClientFromDatabase(clientToInsert)]);
    setNewClient({ name: "", phone: "", cep: "", street: "", number: "", district: "", city: "", state: "", reference: "" });
    await loadClients();
    setLastAction(ignoredColumns.length > 0 ? `Cliente cadastrado no Supabase. Colunas ignoradas: ${ignoredColumns.join(", ")}.` : "Cliente cadastrado com sucesso no Supabase.");
  }

  function updateClientField(id, field, value) {
    let finalValue = value;
    if (field === "phone") finalValue = normalizePhoneInput(value);
    if (field === "state") finalValue = String(value || "").toUpperCase().slice(0, 2);
    setClients((previousClients) => previousClients.map((client) => (client.id === id ? { ...client, [field]: finalValue } : client)));
  }

  async function searchExistingClientCep(id) {
    const client = clients.find((item) => item.id === id);
    if (!client) return;

    const cepNumbers = onlyCepNumbers(client.cep);
    if (!isValidCep(client.cep)) return setLastAction("CEP inválido. Digite 8 números, por exemplo: 87000-000.");

    setLastAction("Buscando endereço do cliente pelo CEP...");
    try {
      const response = await fetch("https://viacep.com.br/ws/" + cepNumbers + "/json/");
      const data = await response.json();
      if (!response.ok || data.erro) return setLastAction("CEP não encontrado. Confira o número digitado.");

      setClients((previousClients) =>
        previousClients.map((item) =>
          item.id === id
            ? {
                ...item,
                cep: formatCep(cepNumbers),
                street: data.logradouro || item.street,
                district: data.bairro || item.district,
                city: data.localidade || item.city,
                state: data.uf || item.state,
              }
            : item
        )
      );
      setLastAction("Endereço do cliente atualizado pelo CEP.");
    } catch {
      setLastAction("Não foi possível consultar o CEP agora. Edite o endereço manualmente.");
    }
  }

  async function saveClientEdits(id) {
    const client = clients.find((item) => item.id === id);
    if (!client) return;
    if (!client.name || !client.phone || !client.cep || !client.street || !client.number || !client.district || !client.city || !client.state) {
      setLastAction("Cliente não salvo: confira nome, telefone, CEP, rua, número, bairro, cidade e estado.");
      return;
    }
    if (!isValidCep(client.cep)) {
      setLastAction("Cliente não salvo: CEP inválido. Digite 8 números.");
      return;
    }
    if (!isValidBrazilMobilePhone(client.phone)) {
      setLastAction("Telefone inválido. Use DDD + 9 + 8 dígitos. Exemplo: (43) 98873-6791.");
      return;
    }
    if (hasDuplicateClientRecord(clients, client, id)) {
      setLastAction("Cliente não salvo: já existe outro cadastro com esse telefone.");
      return;
    }

    const formattedClient = mapClientToDatabase(client);
    const clientPatch = { ...formattedClient };
    delete clientPatch.id;
    const { error, ignoredColumns } = await updateClientInSupabase(id, clientPatch);

    if (error) {
      console.error("Erro ao atualizar cliente no Supabase:", error);
      return setLastAction(`Cliente não atualizado no Supabase: ${error.message || "verifique RLS/policies de UPDATE em clients."}`);
    }

    setClients((previousClients) => previousClients.map((item) => (item.id === id ? mapClientFromDatabase(formattedClient) : item)));
    setLastAction(ignoredColumns.length > 0 ? `Cliente atualizado no Supabase. Colunas ignoradas: ${ignoredColumns.join(", ")}.` : "Dados do cliente atualizados com sucesso no Supabase.");
    setEditingClientId(null);
  }

  async function addCourier() {
    const courierToInsert = mapCourierToDatabase({
      id: Date.now(),
      name: newCourier.name,
      username: newCourier.username,
      password: newCourier.password || generateStrongPassword(),
      active: true,
      createdAt: new Date().toISOString(),
      motorcycleType: newCourier.motorcycleType,
    });
    if (!courierToInsert.name || !courierToInsert.username) return setLastAction("Entregador não salvo: nome e usuário são obrigatórios.");
    if (hasDuplicateCourierUsername(couriers, courierToInsert.username)) return setLastAction("Esse usuário de entregador já existe. Escolha outro usuário.");
    if (!isStrongPassword(courierToInsert.password)) return setLastAction("Senha fraca. Clique em gerar senha forte ou informe uma senha com maiúscula, minúscula, número e símbolo.");

    const { error, ignoredColumns } = await insertCourierInSupabase(courierToInsert);
    if (error || ignoredColumns.includes("password")) {
      console.error("Erro ao cadastrar entregador no Supabase:", error, ignoredColumns);
      return setLastAction(error ? `Entregador não salvo no Supabase: ${error.message || "verifique RLS/policies de INSERT em couriers."}` : "Entregador não salvo: a tabela couriers precisa ter a coluna password para guardar a senha.");
    }

    const savedCourier = mapCourierFromDatabase(courierToInsert);
    setCouriers((previousCouriers) => [...previousCouriers, savedCourier]);
    setNewCourier({ name: "", username: "", password: generateStrongPassword(), motorcycleType: "Moto própria" });
    setLastAction(`Entregador cadastrado no Supabase. Usuário: ${savedCourier.username} • Senha: ${savedCourier.password}`);
  }

  function regenerateCourierPassword() {
    setNewCourier((previousCourier) => ({ ...previousCourier, password: generateStrongPassword() }));
    setLastAction("Nova senha forte gerada para o entregador.");
  }

  async function toggleCourierStatus(id) {
    const courier = couriers.find((item) => item.id === id);
    if (!courier) return;
    const nextActive = !courier.active;
    const { error } = await updateCourierStatusInSupabase(id, nextActive);
    if (error) {
      console.error("Erro ao atualizar entregador no Supabase:", error);
      return setLastAction(`Status do entregador não foi alterado: ${error.message || "verifique UPDATE em couriers."}`);
    }
    setCouriers((previousCouriers) => previousCouriers.map((item) => (item.id === id ? { ...item, active: nextActive } : item)));
    setLastAction("Status do entregador atualizado e salvo no Supabase.");
  }

  async function toggleProductStatus(id) {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    const nextActive = !product.active;
    const { error } = await updateProductStatusInSupabase(id, nextActive);
    if (error) {
      console.error("Erro ao atualizar status do produto:", error);
      return setLastAction(`Status não salvo no Supabase: ${error.message || "verifique policies de UPDATE em products."}`);
    }
    setProducts((previousProducts) => previousProducts.map((item) => (item.id === id ? { ...item, active: nextActive } : item)));
    setLastAction("Status do produto atualizado no Supabase.");
  }

  function confirmStorePasswordForSensitiveAction(actionLabel) {
    const typedPassword = window.prompt(`Digite a senha da loja para ${actionLabel}:`);
    if (typedPassword === null) return false;

    const currentStorePassword = normalizeStoreCredential(storeSession?.password || password || "");
    if (!currentStorePassword) {
      setLastAction("Não foi possível validar a senha da loja nesta sessão. Saia e entre novamente antes de executar esta ação.");
      return false;
    }

    if (normalizeStoreCredential(typedPassword) !== currentStorePassword) {
      setLastAction("Senha da loja incorreta. Ação cancelada.");
      return false;
    }

    return true;
  }

  async function deleteProduct(id) {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    const confirmed = window.confirm(`Tem certeza que deseja excluir o produto "${product.name}"? O histórico de pedidos será preservado.`);
    if (!confirmed) return;

    const { error, ignoredColumns = [] } = await softDeleteProductInSupabase(id);
    if (error) {
      console.error("Erro ao excluir produto:", error);
      return setLastAction(`Produto não excluído no Supabase: ${error.message || "verifique UPDATE em products."}`);
    }

    setProducts((previousProducts) => previousProducts.filter((item) => item.id !== id));
    if (editingProductId === id) setEditingProductId(null);
    setLastAction(ignoredColumns.includes("deleted_at") ? "Produto inativado. Para ocultar definitivamente após recarregar, adicione a coluna deleted_at em products." : "Produto excluído da lista ativa com histórico preservado.");
  }

  async function deleteClient(id) {
    const client = clients.find((item) => item.id === id);
    if (!client) return;
    const confirmed = window.confirm(`Tem certeza que deseja excluir o cliente "${client.name}"? Os pedidos antigos serão preservados.`);
    if (!confirmed) return;

    const { error, ignoredColumns = [] } = await softDeleteClientInSupabase(id);
    if (error) {
      console.error("Erro ao excluir cliente:", error);
      return setLastAction(`Cliente não excluído no Supabase: ${error.message || "verifique UPDATE em clients."}`);
    }

    setClients((previousClients) => previousClients.filter((item) => item.id !== id));
    if (editingClientId === id) setEditingClientId(null);
    setLastAction(ignoredColumns.includes("deleted_at") || ignoredColumns.includes("active") ? "Cliente removido da tela. Para manter oculto após recarregar, adicione active/deleted_at em clients." : "Cliente excluído da lista ativa com histórico preservado.");
  }

  async function deleteCourier(id) {
    const courier = couriers.find((item) => item.id === id);
    if (!courier) return;
    if (!confirmStorePasswordForSensitiveAction(`excluir o entregador ${courier.name}`)) return;
    const confirmed = window.confirm(`Tem certeza que deseja excluir o entregador "${courier.name}"? Os pedidos antigos serão preservados.`);
    if (!confirmed) return;

    const { error, ignoredColumns = [] } = await softDeleteCourierInSupabase(id);
    if (error) {
      console.error("Erro ao excluir entregador:", error);
      return setLastAction(`Entregador não excluído no Supabase: ${error.message || "verifique UPDATE em couriers."}`);
    }

    setCouriers((previousCouriers) => previousCouriers.filter((item) => item.id !== id));
    if (editingCourierId === id) setEditingCourierId(null);
    setLastAction(ignoredColumns.includes("deleted_at") ? "Entregador bloqueado e removido da tela. Para manter oculto após recarregar, adicione deleted_at em couriers." : "Entregador excluído da lista ativa com histórico preservado.");
  }

  function updateProductField(id, field, value) {
    let finalValue = value;
    if (["price", "cost", "stock", "minStock"].includes(field)) finalValue = value === "" ? "" : Number(value || 0);
    setProducts((previousProducts) => previousProducts.map((product) => (product.id === id ? { ...product, [field]: finalValue } : product)));
  }

  async function saveProductEdits(id) {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    if (!product.name || product.price === "" || !product.barcode) {
      setLastAction("Produto não salvo: nome, preço e código de barras são obrigatórios.");
      return;
    }
    if (!normalizeGroupName(product.category)) {
      setLastAction("Produto não salvo: selecione um grupo.");
      return;
    }
    if (!isProductBarcodeAvailable(products, product.barcode, id)) {
      setLastAction("Código de barras já cadastrado em outro produto.");
      return;
    }
    const cleanVariants = normalizeProductVariants(product.variants);
    if (product.hasVariants && cleanVariants.length === 0) {
      setLastAction("Produto não salvo: adicione pelo menos um sabor ou desative a opção de sabores.");
      return;
    }

    const productPatch = buildProductPatch({ ...product, variants: cleanVariants });

    const { error, ignoredColumns } = await updateProductInSupabase(id, productPatch);
    if (error) {
      console.error("Erro ao salvar edição do produto:", error);
      return setLastAction(`Produto não salvo no Supabase: ${error.message || "verifique policies de UPDATE em products."}`);
    }

    await loadProducts();
    setLastAction(ignoredColumns.length > 0 ? `Produto atualizado no Supabase. Colunas ignoradas: ${ignoredColumns.join(", ")}.` : "Produto atualizado com sucesso no Supabase.");
    setEditingProductId(null);
  }

  function updateCourierField(id, field, value) {
    if (field === "username" && !isCourierUsernameAvailable(couriers, value, id)) {
      setLastAction("Esse usuário já existe em outro entregador. Escolha outro.");
      return;
    }

    setCouriers((previousCouriers) => previousCouriers.map((courier) => (courier.id === id ? { ...courier, [field]: value } : courier)));
  }

  function regenerateExistingCourierPassword(id) {
    setCouriers((previousCouriers) => previousCouriers.map((courier) => (courier.id === id ? { ...courier, password: generateStrongPassword() } : courier)));
    setLastAction("Nova senha forte gerada para o entregador cadastrado.");
  }

  async function saveCourierEdits(id) {
    const courier = couriers.find((item) => item.id === id);
    if (!courier) return;
    if (!courier.name.trim() || !courier.username.trim()) {
      setLastAction("Entregador não salvo: nome e usuário são obrigatórios.");
      return;
    }
    if (!isCourierUsernameAvailable(couriers, courier.username, id)) {
      setLastAction("Esse usuário já existe em outro entregador. Escolha outro.");
      return;
    }
    if (!isStrongPassword(courier.password)) {
      setLastAction("Senha fraca. Gere uma nova senha forte antes de salvar.");
      return;
    }
    const formattedCourier = mapCourierToDatabase(courier);
    const courierPatch = { ...formattedCourier };
    delete courierPatch.id;
    const { error, ignoredColumns } = await updateCourierInSupabase(id, courierPatch);
    if (error || ignoredColumns.includes("password")) {
      console.error("Erro ao salvar entregador no Supabase:", error, ignoredColumns);
      return setLastAction(error ? `Entregador não atualizado no Supabase: ${error.message || "verifique UPDATE em couriers."}` : "Entregador não atualizado: a tabela couriers precisa ter a coluna password para manter a senha salva.");
    }
    setCouriers((previousCouriers) => previousCouriers.map((item) => (item.id === id ? mapCourierFromDatabase(formattedCourier) : item)));
    setEditingCourierId(null);
    setLastAction(`Dados do entregador atualizados e salvos. Senha atual: ${formattedCourier.password}`);
  }

  async function searchCep() {
    const cepNumbers = onlyCepNumbers(newClient.cep);
    if (!isValidCep(newClient.cep)) return setLastAction("CEP inválido. Digite 8 números, por exemplo: 87000-000.");
    setLastAction("Buscando endereço pelo CEP...");
    try {
      const response = await fetch("https://viacep.com.br/ws/" + cepNumbers + "/json/");
      const data = await response.json();
      if (!response.ok || data.erro) return setLastAction("CEP não encontrado. Confira o número digitado.");
      setNewClient((previousClient) => ({ ...previousClient, cep: formatCep(cepNumbers), street: data.logradouro || previousClient.street, district: data.bairro || previousClient.district, city: data.localidade || previousClient.city, state: data.uf || previousClient.state }));
      setLastAction("CEP encontrado: " + data.localidade + "/" + data.uf + ". Confira rua, bairro e número antes de cadastrar.");
    } catch {
      setLastAction("Não foi possível consultar o CEP agora. Preencha o endereço manualmente.");
    }
  }

  function addProductToCustomerCart(product) {
    setShowCustomerCheckout(false);
    setShowCustomerNeedMoreMessage(false);
    setCustomerOrderConfirmation(null);

    const productId = product?.id;
    if (productId === undefined || productId === null || product?.active !== true) {
      setCustomerError("Produto indisponível no momento.");
      return;
    }

    const availableStock = Math.max(0, Number(product.stock || 0));
    if (availableStock <= 0) {
      setCustomerError(`${product.name || "Produto"} está sem estoque.`);
      return;
    }

    if (productHasActiveVariants(product)) {
      setCustomerVariantPicker({ open: true, product, quantities: {} });
      setCustomerError("");
      return;
    }

    setCustomerCart((previousCart) => {
      const currentCart = sanitizeCustomerCart(previousCart);
      const existingQuantity = currentCart
        .filter((item) => item.isKit !== true && Number(item.id) === Number(productId))
        .reduce((sum, item) => sum + toPositiveInteger(item.quantity, 1), 0);

      if (existingQuantity + 1 > availableStock) {
        setCustomerError(`Estoque insuficiente para ${product.name || "produto"}. Disponível: ${availableStock}.`);
        return currentCart;
      }

      const existingItem = currentCart.find((item) => item.isKit !== true && Number(item.id) === Number(productId));
      const nextCart = existingItem
        ? currentCart.map((item) =>
            item.isKit !== true && Number(item.id) === Number(productId)
              ? { ...item, quantity: toPositiveInteger(item.quantity, 1) + 1 }
              : item
          )
        : [
            ...currentCart,
            {
              id: productId,
              name: String(product.name || "Produto"),
              price: toSafeMoneyNumber(getProductSalePrice(product, promotions), toSafeMoneyNumber(product.price, 0)),
              originalPrice: toSafeMoneyNumber(product.price, 0),
              promotionId: getProductActivePromotion(product, promotions)?.id || null,
              quantity: 1,
              barcode: product.barcode || "",
              isKit: false,
              cartKey: `prod-${productId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            },
          ];

      const validation = validateOrderItems(nextCart, products);
      if (!validation.valid) {
        setCustomerError(validation.message);
        return currentCart;
      }

      setCustomerError(`${product.name || "Produto"} adicionado ao pedido.`);
      return nextCart;
    });
  }

  function updateCustomerVariantQuantity(variantId, quantity) {
    const safeQuantity = Math.max(0, Number(quantity || 0));
    setCustomerVariantPicker((previousPicker) => ({
      ...previousPicker,
      quantities: { ...previousPicker.quantities, [variantId]: safeQuantity },
    }));
  }

  function closeCustomerVariantPicker() {
    setCustomerVariantPicker({ open: false, product: null, quantities: {} });
  }

  function addSelectedVariantsToCustomerCart() {
    const product = customerVariantPicker.product;
    if (!product) return closeCustomerVariantPicker();
    const selectedVariants = getActiveProductVariants(product)
      .map((variant) => ({ variant, quantity: Math.max(0, Number(customerVariantPicker.quantities?.[variant.id] || 0)) }))
      .filter((item) => item.quantity > 0);

    if (selectedVariants.length === 0) {
      setCustomerError("Escolha pelo menos um sabor para adicionar ao carrinho.");
      return;
    }

    setCustomerCart((previousCart) => {
      const currentCart = sanitizeCustomerCart(previousCart);
      const selectedQuantity = selectedVariants.reduce((sum, item) => sum + item.quantity, 0);
      const existingQuantity = currentCart
        .filter((item) => item.isKit !== true && Number(item.id) === Number(product.id))
        .reduce((sum, item) => sum + toPositiveInteger(item.quantity, 1), 0);
      const availableStock = Math.max(0, Number(product.stock || 0));

      if (existingQuantity + selectedQuantity > availableStock) {
        setCustomerError(`Estoque insuficiente para ${product.name || "produto"}. Disponível: ${availableStock}.`);
        return currentCart;
      }

      const newItems = selectedVariants.map(({ variant, quantity }) => ({
        id: product.id,
        productId: product.id,
        name: makeVariantCartName(product, variant),
        productName: product.name || "Produto",
        variantId: variant.id,
        variantName: variant.name,
        price: toSafeMoneyNumber(getProductSalePrice(product, promotions), toSafeMoneyNumber(product.price, 0)),
        originalPrice: toSafeMoneyNumber(product.price, 0),
        promotionId: getProductActivePromotion(product, promotions)?.id || null,
        quantity,
        barcode: product.barcode || "",
        imageUrl: variant.imageUrl || product.imageUrl || "",
        isKit: false,
        cartKey: `prod-${product.id}-var-${variant.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }));

      const nextCart = [...currentCart, ...newItems];
      const validation = validateOrderItems(nextCart, products);
      if (!validation.valid) {
        setCustomerError(validation.message);
        return currentCart;
      }

      setCustomerError(`${product.name || "Produto"} adicionado ao pedido.`);
      closeCustomerVariantPicker();
      return nextCart;
    });
  }

  function updateCustomerCartQuantity(cartKeyOrProductId, quantity) {
    const safeQuantity = toPositiveInteger(quantity, 1);
    setCustomerCart((previousCart) => {
      const currentCart = sanitizeCustomerCart(previousCart);
      const targetItem = currentCart.find((item) => getCartMatchKey(item) === String(cartKeyOrProductId) || String(item.id) === String(cartKeyOrProductId));
      if (!targetItem) return currentCart;

      const relatedProduct = products.find((product) => Number(product.id) === Number(targetItem.id));
      if (targetItem.isKit !== true && relatedProduct && safeQuantity > Number(relatedProduct.stock || 0)) {
        setCustomerError(`Estoque insuficiente para ${targetItem.name}. Disponível: ${relatedProduct.stock}.`);
        return currentCart;
      }

      const nextCart = currentCart.map((item) => (getCartMatchKey(item) === getCartMatchKey(targetItem) ? { ...item, quantity: safeQuantity } : item));
      const validation = validateOrderItems(nextCart, products);
      if (!validation.valid) {
        setCustomerError(validation.message);
        return currentCart;
      }
      setCustomerError("");
      return nextCart;
    });
  }

  function removeCustomerCartItem(cartKeyOrProductId) {
    setCustomerCart((previousCart) => {
      const currentCart = sanitizeCustomerCart(previousCart);
      const nextCart = currentCart.filter((item) => getCartMatchKey(item) !== String(cartKeyOrProductId) && String(item.id) !== String(cartKeyOrProductId));
      if (nextCart.length === 0) setShowCustomerCheckout(false);
      return nextCart;
    });
    setCustomerError("");
  }

  async function submitCustomerOrder() {
    if (customerSubmitting) return;
    if (!effectiveStoreIsOpen) return setCustomerError(`A loja está fechada no momento. ${storeOpenStatus.message || "Tente novamente dentro do horário de atendimento."}`);
    if (!isCustomerFormComplete(customerForm)) return setCustomerError("Confira seus dados de entrega antes de enviar o pedido.");
    if (customerForm.phone && !isValidBrazilMobilePhone(customerForm.phone)) return setCustomerError("Telefone inválido. Corrija o número antes de enviar o pedido.");

    setCustomerSubmitting(true);
    try {
      const normalizedCustomerName = String(customerForm.name || "").trim();
      const normalizedCustomerPhone = formatBrazilMobilePhone(customerForm.phone);
      const normalizedCustomerCep = formatCep(customerForm.cep);
      const normalizedAddress = `${String(customerForm.street || "").trim()}, ${String(customerForm.number || "").trim()} - ${String(customerForm.district || "").trim()}, ${String(customerForm.city || "").trim()}/${String(customerForm.state || "").trim().toUpperCase().slice(0, 2)}`;
      const cartForSubmit = sanitizeCustomerCart(safeCustomerCart);
      const validation = validateOrderItems(cartForSubmit, products);
      if (!validation.valid) return setCustomerError(validation.message);

      const syncedItems = syncOrderItemsWithProducts(cartForSubmit, products);
      const syncedProductsTotal = buildOrderTotal(syncedItems);
      if (!isOrderAboveMinimum(syncedProductsTotal, storeSettings.minimumOrderValue)) {
        return setCustomerError(`Pedido mínimo de ${money(storeSettings.minimumOrderValue)} em produtos. Adicione mais itens para finalizar.`);
      }

      const deliveryFee = normalizeDeliveryFee(storeSettings.defaultDeliveryFee);
      const finalTotal = buildDeliveryTotal(syncedProductsTotal, deliveryFee);
      const changeForValue = toSafeMoneyNumber(customerChangeFor, 0);
      if (customerPayment === "Dinheiro" && customerChangeFor !== "" && changeForValue > 0 && changeForValue < finalTotal) {
        return setCustomerError(`O valor para troco precisa ser maior ou igual ao total do pedido: ${money(finalTotal)}.`);
      }

      const estimatedDeliveryMinutes = buildEstimatedDeliveryMinutes(deliveries, true);
      const initialPaymentStatus = customerPayment === "Pix" ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.RECEIVABLE;

      const newDelivery = {
        id: Date.now(),
        cashSessionId: cashSession.id || "",
        originType: "delivery",
        orderType: ORDER_TYPE.DELIVERY,
        client: normalizedCustomerName,
        phone: normalizedCustomerPhone,
        address: normalizedAddress,
        payment: customerPayment,
        paymentStatus: initialPaymentStatus,
        changeFor: customerPayment === "Dinheiro" ? customerChangeFor : "",
        productsTotal: syncedProductsTotal,
        deliveryFee,
        courierFee: 0,
        storeFee: 0,
        motorcycleType: "",
        value: finalTotal,
        estimatedDeliveryMinutes,
        whatsappStatus: "not_sent",
        whatsappOpenedAt: "",
        whatsappSentAt: "",
        whatsappMessage: "",
        status: DELIVERY_STATUS.WAITING_STORE_APPROVAL,
        origin: "customer",
        needsStoreApproval: true,
        storeOrderApproved: false,
        approvedAt: "",
        reference: customerForm.reference,
        courierUsername: "ALL",
        courierName: "Todos os motoboys",
        notes: "Pedido enviado pelo cliente",
        items: syncedItems,
        pickedUpByUsername: "",
        pickedUpByName: "",
        pickedUpAt: "",
        deliveredByUsername: "",
        deliveredByName: "",
        deliveredAt: "",
        ownerApproved: false,
        ownerApprovedAt: "",
        launchedAt: new Date().toISOString(),
      };

      let savedDelivery;
      try {
        savedDelivery = await saveDeliveryToSupabase(newDelivery);
      } catch (error) {
        return setCustomerError(`Erro ao enviar pedido para a loja: ${error.message || "verifique Supabase."}`);
      }

      setCustomerForm((previousForm) => ({ ...previousForm, name: normalizedCustomerName, phone: normalizedCustomerPhone, cep: normalizedCustomerCep, state: String(previousForm.state || "").trim().toUpperCase().slice(0, 2) }));
      setDeliveries((previousDeliveries) => [savedDelivery, ...previousDeliveries]);
      setProducts((previousProducts) => {
        const nextProducts = reduceProductStock(previousProducts, syncedItems);
        persistProductStocks(nextProducts);
        return nextProducts;
      });
      addNotification("novo_pedido", "Novo pedido recebido", `${normalizedCustomerName} enviou um pedido de ${money(savedDelivery.value)}.`, "loja", savedDelivery.id);
      addNotification("pedido_recebido", "Pedido recebido pela loja", `Pedido #${savedDelivery.id} recebido. A loja vai aprovar e liberar para entrega.`, "customer", savedDelivery.id, { customerPhone: normalizedCustomerPhone });
      setCustomerCart([]);
      setShowCustomerCheckout(false);
      setCustomerChangeFor("");
      setCustomerOrderConfirmation(buildOrderConfirmation(savedDelivery));
      setCustomerError("Pedido enviado para a loja. Aguarde a confirmação.");
    } finally {
      setCustomerSubmitting(false);
    }
  }

  function addProductToDelivery(product) {
    setDeliveryDraft((previousDraft) => {
      const existingItem = previousDraft.items.find((item) => item.id === product.id);
      const nextItems = existingItem
        ? previousDraft.items.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
        : [...previousDraft.items, { id: product.id, name: product.name, price: Number(product.price || 0), quantity: 1, barcode: product.barcode }];

      const validation = validateOrderItems(nextItems, products);
      if (!validation.valid) {
        setLastAction(validation.message);
        return previousDraft;
      }

      setLastAction(product.name + " adicionado ao pedido.");
      return { ...previousDraft, items: nextItems };
    });
  }

  function addProductToCounter(product) {
    setCounterDraft((previousDraft) => {
      const existingItem = previousDraft.items.find((item) => item.id === product.id);
      const nextItems = existingItem
        ? previousDraft.items.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
        : [...previousDraft.items, { id: product.id, name: product.name, price: Number(product.price || 0), quantity: 1, barcode: product.barcode }];

      const validation = validateOrderItems(nextItems, products);
      if (!validation.valid) {
        setLastAction(validation.message);
        return previousDraft;
      }

      setLastAction(product.name + " adicionado ao PDV balcão.");
      return { ...previousDraft, items: nextItems };
    });
  }

  function addKitToCounter(kit) {
    const kitItems = getKitItemsForOrder(kit, products);
    setCounterDraft((previousDraft) => {
      const nextItems = [...previousDraft.items, { id: `kit-counter-${kit.id}-${Date.now()}`, name: kit.name, price: Number(kit.price || buildKitProductsTotal(kit.items, products)), quantity: 1, barcode: "KIT", isKit: true, kitId: kit.id, kitItems }];
      const validation = validateOrderItems(nextItems, products);
      if (!validation.valid) {
        setLastAction(validation.message);
        return previousDraft;
      }
      setLastAction(kit.name + " adicionado ao PDV balcão.");
      return { ...previousDraft, items: nextItems };
    });
  }

  function updateDeliveryItemQuantity(productId, quantity) {
    const safeQuantity = Math.max(1, Number(quantity || 1));
    setDeliveryDraft((previousDraft) => {
      const nextItems = previousDraft.items.map((item) => (item.id === productId ? { ...item, quantity: safeQuantity } : item));
      const validation = validateOrderItems(nextItems, products);
      if (!validation.valid) {
        setLastAction(validation.message);
        return previousDraft;
      }
      return { ...previousDraft, items: nextItems };
    });
  }

  function removeDeliveryItem(productId) {
    setDeliveryDraft((previousDraft) => ({ ...previousDraft, items: previousDraft.items.filter((item) => item.id !== productId) }));
  }

  function updateCounterItemQuantity(productId, quantity) {
    const safeQuantity = Math.max(1, Number(quantity || 1));
    setCounterDraft((previousDraft) => {
      const nextItems = previousDraft.items.map((item) => (item.id === productId ? { ...item, quantity: safeQuantity } : item));
      const validation = validateOrderItems(nextItems, products);
      if (!validation.valid) {
        setLastAction(validation.message);
        return previousDraft;
      }
      return { ...previousDraft, items: nextItems };
    });
  }

  function removeCounterItem(productId) {
    setCounterDraft((previousDraft) => ({ ...previousDraft, items: previousDraft.items.filter((item) => item.id !== productId) }));
  }

  function getSafePrintCopies(value, fallback = 1) {
    const copies = Math.floor(Number(value || fallback));
    if (!Number.isFinite(copies)) return fallback;
    return Math.min(4, Math.max(1, copies));
  }

  function getAutoPrintCopies() {
    return getSafePrintCopies(storeSettings.customerOrderPrintCopies, 2);
  }

  function getManualReprintCopies() {
    return getSafePrintCopies(storeSettings.manualReprintCopies, 1);
  }

  function getPrintCloseDelaySeconds() {
    const seconds = Math.floor(Number(storeSettings.printCloseDelaySeconds || 0));
    if (!Number.isFinite(seconds)) return 0;
    return Math.min(10, Math.max(0, seconds));
  }

  function printThermalHtml(title, bodyHtml, copies = 1, options = {}) {
    return printThermalHtmlBase(title, bodyHtml, copies, {
      closeAfterPrintSeconds: getPrintCloseDelaySeconds(),
      ...options,
      onBlocked: () => setLastAction("Navegador bloqueou a impressão. Libere pop-ups e tente novamente."),
      onError: () => setLastAction("Não foi possível preparar a impressão. Tente novamente."),
    });
  }


  async function openCashRegister() {
    if (cashSession.isOpen) return setLastAction("O caixa já está aberto.");

    const { data: existingOpen, error: existingError } = await findOpenCashSessionFromSupabase();
    if (existingError) return setLastAction(`Não consegui verificar caixa aberto: ${existingError.message || "verifique cash_sessions."}`);

    if (existingOpen) {
      setCashSession({
        isOpen: true,
        id: existingOpen.id,
        openedAt: existingOpen.opened_at || new Date().toISOString(),
        closedAt: "",
        openingAmount: Number(existingOpen.opening_amount || 0),
        sangrias: [],
      });
      await loadCashData();
      return setLastAction("Já havia um caixa aberto no Supabase. O sistema foi sincronizado com esse caixa.");
    }

    const openingAmount = Math.max(0, Number(openingCashInput || 0));
    const { data, error, openedAt } = await openCashSessionInSupabase({
      openingAmount,
      openedBy: getCurrentStoreUserName(),
    });

    if (error) return setLastAction(`Caixa não aberto no Supabase: ${error.message || "verifique cash_sessions."}`);

    const sessionId = data?.id || "";
    setCashSession({ isOpen: true, id: sessionId, openedAt, closedAt: "", openingAmount, sangrias: [] });
    setOpeningCashInput("");
    setClosingCashCounted("");
    await auditAction("open_cash_session", "cash_sessions", sessionId, { openingAmount });
    setLastAction(`Caixa aberto no Supabase com fundo inicial de ${money(openingAmount)}.`);
  }


  async function addSangria() {
    if (!cashSession.isOpen) return setLastAction("Abra o caixa antes de lançar sangria.");
    const value = Math.max(0, Number(sangriaDraft.value || 0));
    if (value <= 0) return setLastAction("Informe o valor da sangria.");

    const { movement, error } = await insertCashSangriaInSupabase({
      cashSession,
      value,
      reason: sangriaDraft.reason?.trim() || "Sangria",
    });

    if (error) return setLastAction(`Sangria não salva no Supabase: ${error.message || "verifique cash_movements."}`);

    await auditAction("cash_sangria", "cash_sessions", cashSession.id, { value, reason: movement.reason });
    setCashSession((previous) => ({ ...previous, sangrias: [movement, ...(previous.sangrias || [])] }));
    setSangriaDraft({ value: "", reason: "" });
    setLastAction(`Sangria registrada no Supabase: ${money(value)}.`);
  }


  function printCashClosingReceipt(report, countedCash, difference, options = {}) {
    const paymentRows = [
      ["Pix", report.byPayment?.Pix || 0],
      ["Dinheiro", report.byPayment?.Dinheiro || 0],
      ["Débito", report.byPayment?.["Cartão débito"] || 0],
      ["Crédito", report.byPayment?.["Cartão crédito"] || 0],
    ].map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td class="right">${escapeHtml(money(value))}</td></tr>`).join("");

    const body = `
      <h1>${escapeHtml(storeSettings.storeName || "BARBOSAS")}</h1>
      <p class="center muted">FECHAMENTO DE CAIXA</p>
      ${options.reprint ? `<p class="center danger"><b>REIMPRESSÃO</b></p>` : ""}
      <p><b>Operador:</b> ${escapeHtml(getCurrentStoreDisplayName())}</p>
      <p><b>Abertura:</b> ${escapeHtml(report.openedAt ? new Date(report.openedAt).toLocaleString("pt-BR") : "-")}</p>
      <p><b>Fechamento:</b> ${escapeHtml(new Date().toLocaleString("pt-BR"))}</p>
      <div class="line"></div>
      <h2>Resumo financeiro</h2>
      <table>
        <tbody>
          <tr><td>Total vendido</td><td class="right"><b>${escapeHtml(money(report.totalSold))}</b></td></tr>
          <tr><td>Total recebido</td><td class="right"><b>${escapeHtml(money(report.totalReceived))}</b></td></tr>
          <tr><td>Pendente/fiado</td><td class="right">${escapeHtml(money(report.pendingAmount))}</td></tr>
          <tr><td>Cancelados</td><td class="right">${escapeHtml(String(report.cancelledOrders || 0))} • ${escapeHtml(money(report.cancelledAmount || 0))}</td></tr>
        </tbody>
      </table>
      <div class="line"></div>
      <h2>Formas de pagamento</h2>
      <table><tbody>${paymentRows}</tbody></table>
      <div class="line"></div>
      <h2>Conferência da gaveta</h2>
      <table>
        <tbody>
          <tr><td>Fundo inicial</td><td class="right">${escapeHtml(money(report.openingAmount))}</td></tr>
          <tr><td>Dinheiro recebido</td><td class="right">${escapeHtml(money(report.expectedCash))}</td></tr>
          <tr><td>Sangrias/retiradas</td><td class="right">-${escapeHtml(money(report.sangriaTotal))}</td></tr>
          <tr><td><b>Dinheiro esperado</b></td><td class="right"><b>${escapeHtml(money(report.expectedDrawerCash))}</b></td></tr>
          <tr><td>Dinheiro contado</td><td class="right">${escapeHtml(money(countedCash))}</td></tr>
          <tr><td><b>Diferença</b></td><td class="right"><b>${escapeHtml(money(difference))}</b></td></tr>
        </tbody>
      </table>
      <div class="line"></div>
      <h2>Operação</h2>
      <p><b>Entregas:</b> ${escapeHtml(String(report.deliveryOrders || 0))} • ${escapeHtml(money(report.deliverySold || 0))}</p>
      <p><b>Balcão/comandas:</b> ${escapeHtml(String(report.counterOrders || 0))} • ${escapeHtml(money(report.counterSold || 0))}</p>
      <p><b>Pedidos pagos:</b> ${escapeHtml(String(report.paidOrders || 0))}</p>
      <p><b>Pedidos pendentes:</b> ${escapeHtml(String(report.pendingOrders || 0))}</p>
      <div class="line"></div>
      <p class="center"><b>Conferido por:</b> __________________</p>
      <p class="center muted">Versão ${escapeHtml(APP_VERSION)}</p>
    `;
    const printed = printThermalHtml("FECHAMENTO DE CAIXA", body, 1, { delivery: true });
    if (printed) auditAction(options.reprint ? "reprint_cash_closing" : "print_cash_closing", "cash_sessions", cashSession.id || options.cashSessionId || "", { totalSold: report.totalSold, totalReceived: report.totalReceived, difference });
    return printed;
  }

  function printPeriodSalesReport() {
    const paymentRows = [
      ["Pix", periodSalesReport.byPayment?.Pix || 0],
      ["Dinheiro", periodSalesReport.byPayment?.Dinheiro || 0],
      ["Débito", periodSalesReport.byPayment?.["Cartão débito"] || 0],
      ["Crédito", periodSalesReport.byPayment?.["Cartão crédito"] || 0],
    ].map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td class="right">${escapeHtml(money(value))}</td></tr>`).join("");
    const body = `
      <h1>${escapeHtml(storeSettings.storeName || "BARBOSAS")}</h1>
      <p class="center muted">RELATÓRIO DE VENDAS POR PERÍODO</p>
      <p><b>Período:</b> ${escapeHtml(reportRange.startDate || "início")} até ${escapeHtml(reportRange.endDate || "hoje")}</p>
      <p><b>Emitido por:</b> ${escapeHtml(getCurrentStoreDisplayName())}</p>
      <p><b>Emissão:</b> ${escapeHtml(new Date().toLocaleString("pt-BR"))}</p>
      <div class="line"></div>
      <table><tbody>
        <tr><td>Total vendido</td><td class="right"><b>${escapeHtml(money(periodSalesReport.totalSold))}</b></td></tr>
        <tr><td>Total recebido</td><td class="right"><b>${escapeHtml(money(periodSalesReport.totalPaid))}</b></td></tr>
        <tr><td>Pendente/fiado</td><td class="right">${escapeHtml(money(periodSalesReport.pendingAmount))}</td></tr>
        <tr><td>Cancelados</td><td class="right">${escapeHtml(String(periodSalesReport.cancelledOrders.length))}</td></tr>
        <tr><td>Entregas</td><td class="right">${escapeHtml(String(periodSalesReport.deliveryOrders || 0))}</td></tr>
        <tr><td>Balcão/comandas</td><td class="right">${escapeHtml(String(periodSalesReport.counterOrders || 0))}</td></tr>
      </tbody></table>
      <div class="line"></div>
      <h2>Formas de pagamento</h2>
      <table><tbody>${paymentRows}</tbody></table>
      <p class="center muted">Versão ${escapeHtml(APP_VERSION)}</p>
    `;
    const printed = printThermalHtml("RELATÓRIO DE VENDAS", body, 1, { delivery: true });
    if (printed) auditAction("print_period_sales_report", "reports", `${reportRange.startDate}_${reportRange.endDate}`, { ...periodSalesReport, orders: periodSalesReport.orders?.length || 0 });
  }

  function printProductSalesReport() {
    const topProducts = productSalesReport.slice(0, 40);
    const rows = buildPrintableRowsHtml(topProducts, [
      { key: "name", render: (row) => row.name },
      { key: "quantity", render: (row) => String(row.quantity) },
      { key: "total", render: (row) => money(row.total) },
    ]);
    const body = `
      <h1>${escapeHtml(storeSettings.storeName || "BARBOSAS")}</h1>
      <p class="center muted">RELATÓRIO DE PRODUTOS VENDIDOS</p>
      <p><b>Período:</b> ${escapeHtml(reportRange.startDate || "início")} até ${escapeHtml(reportRange.endDate || "hoje")}</p>
      <div class="line"></div>
      <table><thead><tr><th>Produto</th><th>Qtd</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="center muted">Versão ${escapeHtml(APP_VERSION)}</p>
    `;
    const printed = printThermalHtml("PRODUTOS VENDIDOS", body, 1, { delivery: true });
    if (printed) auditAction("print_product_sales_report", "reports", `${reportRange.startDate}_${reportRange.endDate}`, { products: topProducts.length });
  }

  function setReportQuickRange(kind) {
    const now = new Date();
    const toInputDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const today = toInputDate(now);
    if (kind === "today") {
      setReportRange({ startDate: today, endDate: today });
      return;
    }
    if (kind === "last7") {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      setReportRange({ startDate: toInputDate(start), endDate: today });
      return;
    }
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    setReportRange({ startDate: toInputDate(startOfMonth), endDate: today });
  }

  function exportPeriodSalesCsv() {
    const headers = ["Pedido", "Data", "Cliente", "Telefone", "Tipo", "Status", "Pagamento", "Status pagamento", "Subtotal produtos", "Taxa entrega", "Desconto", "Total"];
    const rows = periodSalesReport.orders.map((order) => [
      getOrderLabel(order),
      order.launchedAt || order.createdAt || "",
      order.client || order.customerName || "",
      formatBrazilMobilePhone(order.phone || ""),
      isDeliveryOrder(order) ? "Entrega" : "Balcão/Comanda",
      order.status || "",
      order.payment || "",
      order.paymentStatus || "",
      toSafeMoneyNumber(order.productsTotal, buildDiscountedProductsTotal(buildOrderTotal(order.items || []), normalizeDiscount(order.discount, buildOrderTotal(order.items || [])))).toFixed(2).replace(".", ","),
      toSafeMoneyNumber(order.deliveryFee, 0).toFixed(2).replace(".", ","),
      toSafeMoneyNumber(order.discount, 0).toFixed(2).replace(".", ","),
      toSafeMoneyNumber(order.value, 0).toFixed(2).replace(".", ","),
    ]);
    downloadCsvFile(`barbosas-vendas-${buildReportFileDate()}.csv`, headers, rows);
    auditAction("export_period_sales_csv", "reports", buildReportFileDate(), { rows: rows.length });
    setLastAction("Relatório de vendas exportado em CSV.");
  }

  function exportProductSalesCsv() {
    const headers = ["Produto", "Tipo", "Quantidade", "Pedidos", "Ticket médio", "Total vendido"];
    const rows = productSalesReport.map((row) => [row.name, row.kind || "Produto", row.quantity, row.orders, money(row.averageTicket), money(row.total)]);
    downloadCsvFile(`barbosas-produtos-${buildReportFileDate()}.csv`, headers, rows);
    auditAction("export_product_sales_csv", "reports", buildReportFileDate(), { rows: rows.length });
    setLastAction("Ranking de produtos exportado em CSV.");
  }

  function exportCategorySalesCsv() {
    const headers = ["Categoria", "Itens vendidos", "Produtos", "Total vendido"];
    const rows = categorySalesReport.map((row) => [row.category, row.quantity, row.products, money(row.total)]);
    downloadCsvFile(`barbosas-categorias-${buildReportFileDate()}.csv`, headers, rows);
    auditAction("export_category_sales_csv", "reports", buildReportFileDate(), { rows: rows.length });
    setLastAction("Relatório de categorias exportado em CSV.");
  }

  function printCashClosingFromRecord(closing) {
    const report = closing.closingSnapshot || {
      totalSold: closing.totalSold || 0,
      totalReceived: closing.totalReceived || 0,
      pendingAmount: closing.pendingAmount || 0,
      cancelledOrders: 0,
      cancelledAmount: closing.cancelledAmount || 0,
      byPayment: closing.byPayment || {},
      openingAmount: closing.openingAmount || 0,
      expectedCash: closing.byPayment?.Dinheiro || 0,
      sangriaTotal: closing.sangriaTotal || 0,
      expectedDrawerCash: (closing.openingAmount || 0) + (closing.byPayment?.Dinheiro || 0) - (closing.sangriaTotal || 0),
      deliveryOrders: 0,
      deliverySold: 0,
      counterOrders: 0,
      counterSold: 0,
      paidOrders: 0,
      pendingOrders: 0,
      openedAt: closing.openedAt || "",
    };
    printCashClosingReceipt(report, closing.countedCash || report.expectedDrawerCash || 0, closing.difference || 0, { reprint: true, cashSessionId: closing.id });
  }

  async function persistCashClosing(record) {
    const sessionId = cashSession.id;
    if (!sessionId) throw new Error("Não existe cash_session_id aberto para fechar.");
    const payload = {
      status: "closed",
      closed_at: record.closedAt || new Date().toISOString(),
      closed_by: getCurrentStoreUserName(),
      total_sold: Number(record.totalSold || 0),
      total_received: Number(record.totalReceived || 0),
      pix_total: Number(record.byPayment?.Pix || 0),
      debit_total: Number(record.byPayment?.["Cartão débito"] || 0),
      credit_total: Number(record.byPayment?.["Cartão crédito"] || 0),
      cash_total: Number(record.byPayment?.Dinheiro || 0),
      pending_total: Number(record.pendingAmount || 0),
      cancelled_total: Number(record.cancelledAmount || 0),
      expected_cash: Number(record.expectedDrawerCash || 0),
      counted_cash: Number(record.countedCash || 0),
      difference: Number(record.difference || 0),
      closing_snapshot: record,
      notes: "Fechamento de caixa salvo pelo painel",
    };
    const { error } = await closeCashSessionInSupabase(sessionId, payload);
    if (error) throw new Error(error.message || "Fechamento não salvo no Supabase cash_sessions.");
    await auditAction("close_cash_session", "cash_sessions", sessionId, payload);
    setCashClosings((previous) => [record, ...(previous || [])]);
    return true;
  }


  function shouldAutoPrintIncomingCustomerOrder(delivery) {
    if (storeSettings.autoPrintCustomerOrders === false) return false;
    if (!delivery || !isDeliveryOrder(delivery)) return false;
    if (String(delivery.id || "") === "") return false;
    if (delivery.status !== DELIVERY_STATUS.WAITING_STORE_APPROVAL) return false;
    if (delivery.origin !== "customer") return false;
    if (autoPrintedDeliveryIdsRef.current.has(String(delivery.id))) return false;
    return true;
  }

  function registerDeliveryAsPrinted(deliveryId) {
    const normalizedId = String(deliveryId || "");
    if (!normalizedId) return;
    autoPrintedDeliveryIdsRef.current.add(normalizedId);
    knownDeliveryIdsRef.current.add(normalizedId);
  }

  function printDeliveryReceipt(delivery, copies = null, printOptions = {}) {
    const receiptCopies = getSafePrintCopies(copies ?? getManualReprintCopies(), getManualReprintCopies());
    const itemsHtml = buildReceiptItemsHtml(delivery.items || []);
    const isDelivery = isDeliveryOrder(delivery);
    const body = `
      ${isDelivery ? `<h1 class="brand">BARBOSAS DELIVERY</h1><p class="center thanks">Obrigado pela preferência! 💛</p>` : `<h1>${escapeHtml(storeSettings.storeName || "BARBOSAS")}</h1>`}
      <p class="muted">${delivery.orderType === ORDER_TYPE.COUNTER ? "VENDA BALCÃO" : "PEDIDO ENTREGA"} #${escapeHtml(delivery.id)}</p>
      <p class="muted">${escapeHtml(new Date().toLocaleString("pt-BR"))}</p>
      <div class="line"></div>
      <p><b>Cliente:</b> ${escapeHtml(delivery.client || "-")}</p>
      <p><b>Telefone:</b> ${escapeHtml(delivery.phone ? formatBrazilMobilePhone(delivery.phone) : "-")}</p>
      <p><b>Endereço:</b> ${escapeHtml(delivery.address || "-")}</p>
      <p><b>Pagamento:</b> ${escapeHtml(getPaymentLabel(delivery.payment, delivery.changeFor, delivery.mixedPaymentDetails))}</p>
      ${delivery.payment === "Dinheiro" && calculateChangeDue(delivery.changeFor, delivery.value) > 0 ? `<p><b>Troco:</b> ${escapeHtml(money(calculateChangeDue(delivery.changeFor, delivery.value)))}</p>` : ""}
      <div class="line"></div>
      <table><thead><tr><th>Qtd</th><th>Produto</th><th>Un.</th><th>Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
      <div class="line"></div>
      <p><b>Produtos:</b> ${escapeHtml(money(delivery.productsTotal ?? Number(delivery.value || 0) - (isCounterOrder(delivery) ? 0 : normalizeDeliveryFee(delivery.deliveryFee))))}</p>
      <p><b>Desconto:</b> -${escapeHtml(money(delivery.discount || 0))}</p>
      <p><b>Entrega:</b> ${escapeHtml(money(isCounterOrder(delivery) ? 0 : normalizeDeliveryFee(delivery.deliveryFee)))}</p>
      <div class="total">TOTAL: ${escapeHtml(money(Number(delivery.value || 0)))}</div>
      ${delivery.notes ? `<p><b>Obs:</b> ${escapeHtml(delivery.notes)}</p>` : ""}
      <div class="line"></div>
      <p class="center">${isDelivery ? "Via de entrega • Conferir endereço e itens" : "Conferir venda no balcão"}</p>
      ${isDelivery ? `<p class="center thanks">Barbosas Delivery agradece!</p>` : ""}
    `;
    const printed = printThermalHtml(`${isCounterOrder(delivery) ? "VENDA" : "ENTREGA"} #${delivery.id}`, body, receiptCopies, { delivery: isDelivery, ...printOptions });
    if (printed) {
      auditAction("print_receipt", "orders", delivery.id, { copies: receiptCopies, orderType: delivery.orderType || ORDER_TYPE.DELIVERY, value: delivery.value });
      setLastAction(`Impressão aberta em ${receiptCopies} via${receiptCopies > 1 ? "s" : ""}.`);
    }
    return printed;
  }

  useEffect(() => {
    if (!deliveriesLoaded) return;

    const currentIds = new Set(deliveries.map((delivery) => String(delivery.id || "")).filter(Boolean));

    if (!autoPrintInitializedRef.current) {
      knownDeliveryIdsRef.current = currentIds;
      autoPrintInitializedRef.current = true;
      return;
    }

    const knownIds = knownDeliveryIdsRef.current;
    const newCustomerOrders = deliveries
      .filter((delivery) => !knownIds.has(String(delivery.id || "")) && shouldAutoPrintIncomingCustomerOrder(delivery))
      .sort((first, second) => new Date(first.launchedAt || first.createdAt || 0).getTime() - new Date(second.launchedAt || second.createdAt || 0).getTime());

    knownDeliveryIdsRef.current = currentIds;

    if (!isLogged || newCustomerOrders.length === 0) return;

    const autoPrintCopies = getAutoPrintCopies();
    newCustomerOrders.forEach((delivery) => {
      const printed = printDeliveryReceipt(delivery, autoPrintCopies, { autoPrint: true });
      if (printed) {
        registerDeliveryAsPrinted(delivery.id);
        setLastAction(`Pedido #${delivery.id} recebido do cliente e impressão automática aberta em ${autoPrintCopies} via${autoPrintCopies > 1 ? "s" : ""}.`);
      } else {
        setLastAction(`Pedido #${delivery.id} recebido. O navegador bloqueou a impressão automática; clique em Reimprimir no pedido.`);
      }
    });
  // Impressão automática intencionalmente observa apenas dados e configurações persistentes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveries, deliveriesLoaded, isLogged, storeSettings.autoPrintCustomerOrders, storeSettings.customerOrderPrintCopies, storeSettings.manualReprintCopies, storeSettings.printCloseDelaySeconds]);

  async function launchCounterSale() {
    if (!isCashOpen) return setLastAction("Abra o caixa antes de usar o PDV Balcão.");
    const preOpenedPrintWindow = window.open("about:blank", "_blank", "width=420,height=760");
    if (!preOpenedPrintWindow) return setLastAction("Navegador bloqueou a impressão. Libere pop-ups para finalizar e imprimir a venda.");
    if (counterDraft.phone && !isValidBrazilMobilePhone(counterDraft.phone)) { preOpenedPrintWindow.close(); return setLastAction("Telefone do balcão inválido. Use DDD + 9 + 8 dígitos ou deixe em branco."); }
    const validation = validateOrderItems(counterDraft.items, products);
    if (!validation.valid) { if (typeof preOpenedPrintWindow !== "undefined" && preOpenedPrintWindow) preOpenedPrintWindow.close(); return setLastAction(validation.message); }

    const syncedItems = syncOrderItemsWithProducts(counterDraft.items, products);
    const syncedProductsTotal = buildOrderTotal(syncedItems);
    const syncedDiscount = normalizeDiscount(counterDraft.discount, syncedProductsTotal);
    const syncedFinalTotal = buildDiscountedProductsTotal(syncedProductsTotal, syncedDiscount);
    if (counterDraft.payment === "Dinheiro" && counterDraft.changeFor && toSafeMoneyNumber(counterDraft.changeFor, 0) < syncedFinalTotal) {
      preOpenedPrintWindow.close();
      return setLastAction(`Valor recebido menor que o total. Total: ${money(syncedFinalTotal)} • recebido: ${money(counterDraft.changeFor)}.`);
    }

    const newSale = {
      id: Date.now(),
      cashSessionId: cashSession.id || "",
      originType: "counter",
      orderType: ORDER_TYPE.COUNTER,
      client: counterDraft.customerName?.trim() || "Cliente balcão",
      phone: counterDraft.phone ? formatBrazilMobilePhone(counterDraft.phone) : "",
      address: "Venda no balcão",
      payment: counterDraft.payment,
      paymentStatus: counterDraft.payment === "Pix" || counterDraft.payment === "Cartão débito" || counterDraft.payment === "Cartão crédito" || counterDraft.payment === "Dinheiro" ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PENDING,
      changeFor: counterDraft.payment === "Dinheiro" ? counterDraft.changeFor : "",
      productsTotal: syncedProductsTotal,
      deliveryFee: 0,
      discount: syncedDiscount,
      courierFee: 0,
      storeFee: 0,
      motorcycleType: "",
      value: syncedFinalTotal,
      status: DELIVERY_STATUS.CONFIRMED_DELIVERED,
      reference: "Venda balcão",
      courierUsername: "BALCAO",
      courierName: "PDV Balcão",
      notes: counterDraft.notes || "Venda realizada no balcão",
      items: syncedItems,
      pickedUpByUsername: "",
      pickedUpByName: "",
      pickedUpAt: "",
      deliveredByUsername: "",
      deliveredByName: "PDV Balcão",
      deliveredAt: new Date().toISOString(),
      ownerApproved: true,
      ownerApprovedAt: new Date().toISOString(),
      launchedAt: new Date().toISOString(),
    };

    let savedSale;
    try {
      savedSale = await saveDeliveryToSupabase(newSale);
    } catch (error) {
      preOpenedPrintWindow.close();
      return setLastAction(`Venda não salva no Supabase: ${error.message || "verifique Supabase."}`);
    }

    setDeliveries((previousDeliveries) => [savedSale, ...previousDeliveries]);
    setProducts((previousProducts) => {
      const nextProducts = reduceProductStock(previousProducts, syncedItems);
      persistProductStocks(nextProducts);
      return nextProducts;
    });
    printDeliveryReceipt(savedSale, 1, { printWindow: preOpenedPrintWindow });
    setCounterDraft({ customerName: "Cliente balcão", phone: "", payment: "Pix", changeFor: "", notes: "", items: [], discount: 0 });
    setCounterProductSearch("");
    setCounterKitSearch("");
    setLastAction("Venda de balcão registrada no Supabase, estoque baixado e impressão aberta.");
  }

  async function launchDeliveryOrder() {
    if (!isCashOpen) return setLastAction("Abra o caixa antes de lançar pedidos no PDV Entregas.");
    if (!selectedDeliveryClient) return setLastAction("Selecione o cliente antes de lançar a entrega.");
    const validation = validateOrderItems(deliveryDraft.items, products);
    if (!validation.valid) return setLastAction(validation.message);

    const syncedItems = syncOrderItemsWithProducts(deliveryDraft.items, products);
    const syncedProductsTotal = buildOrderTotal(syncedItems);
    const syncedDiscount = normalizeDiscount(deliveryDraft.discount, syncedProductsTotal);
    const syncedFinalTotal = buildDeliveryTotal(syncedProductsTotal, deliveryDraftFee, syncedDiscount);
    const estimatedDeliveryMinutes = buildEstimatedDeliveryMinutes(deliveries, true);

    const newDelivery = {
      id: Date.now(),
      cashSessionId: cashSession.id || "",
      originType: "delivery",
      orderType: ORDER_TYPE.DELIVERY,
      client: selectedDeliveryClient.name,
      phone: selectedDeliveryClient.phone,
      address: buildDeliveryAddress(selectedDeliveryClient),
      payment: deliveryDraft.payment,
      paymentStatus: deliveryDraft.payment === "Pix" ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.RECEIVABLE,
      changeFor: deliveryDraft.payment === "Dinheiro" ? deliveryDraft.changeFor : "",
      productsTotal: syncedProductsTotal,
      deliveryFee: deliveryDraftFee,
      discount: syncedDiscount,
      courierFee: 0,
      storeFee: 0,
      motorcycleType: "",
      value: syncedFinalTotal,
      estimatedDeliveryMinutes,
      whatsappStatus: "not_sent",
      whatsappOpenedAt: "",
      whatsappSentAt: "",
      whatsappMessage: "",
      status: DELIVERY_STATUS.WAITING_PICKUP,
      origin: "store",
      needsStoreApproval: false,
      storeOrderApproved: true,
      approvedAt: new Date().toISOString(),
      reference: selectedDeliveryClient.reference,
      courierUsername: "ALL",
      courierName: "Todos os motoboys",
      notes: deliveryDraft.notes,
      items: syncedItems,
      pickedUpByUsername: "",
      pickedUpByName: "",
      pickedUpAt: "",
      deliveredByUsername: "",
      deliveredByName: "",
      deliveredAt: "",
      ownerApproved: false,
      ownerApprovedAt: "",
      launchedAt: new Date().toISOString(),
    };

    let savedDelivery;
    try {
      savedDelivery = await saveDeliveryToSupabase(newDelivery);
    } catch (error) {
      return setLastAction(`Entrega não salva no Supabase: ${error.message || "verifique Supabase."}`);
    }

    setDeliveries((previousDeliveries) => [savedDelivery, ...previousDeliveries]);
    setProducts((previousProducts) => {
      const nextProducts = reduceProductStock(previousProducts, syncedItems);
      persistProductStocks(nextProducts);
      return nextProducts;
    });
    addNotification("pedido_pdv_entrega", "Pedido lançado no PDV Entregas", `Pedido #${savedDelivery.id} de ${selectedDeliveryClient.name} foi lançado com total de ${money(savedDelivery.value)}.`, "loja", savedDelivery.id);
    addNotification("nova_entrega", "Nova entrega disponível", `Pedido #${savedDelivery.id} liberado para retirada na loja.`, "courier", savedDelivery.id);
    registerDeliveryAsPrinted(savedDelivery.id);
    printDeliveryReceipt(savedDelivery, 2);
    setDeliveryDraft({ clientId: "", payment: "Pix", changeFor: "", notes: "", items: [], deliveryFee: storeSettings.defaultDeliveryFee, discount: 0 });
    setDeliveryProductSearch("");
    setPvdKitSearch("");
    setLastAction("Entrega lançada no Supabase, taxa adicionada e impressão enviada para o navegador.");
  }

  function isCourierActionBusy(id) {
    return Boolean(courierActionIds[String(id)]);
  }

  async function runCourierAction(id, label, action) {
    const key = String(id);
    if (courierActionIds[key]) {
      setLastAction(`Aguarde: ${label} do pedido #${id} já está em andamento.`);
      return;
    }

    setCourierActionIds((previous) => ({ ...previous, [key]: label }));
    try {
      await action();
    } finally {
      setCourierActionIds((previous) => {
        const next = { ...previous };
        delete next[key];
        return next;
      });
    }
  }

  async function markCourierPickedUp(id) {
    const delivery = deliveries.find((item) => item.id === id);
    if (!delivery || !isDeliveryOrder(delivery) || needsStoreApprovalBeforeCourier(delivery) || delivery.status !== DELIVERY_STATUS.WAITING_PICKUP) return setLastAction("Essa entrega não está disponível para retirada ou ainda precisa ser aprovada pela loja.");
    const rpcResult = await supabase.rpc("accept_delivery_order", { p_order_id: id, p_courier_username: loggedCourier?.username || "", p_courier_name: loggedCourier?.name || "" });
    const rpcMissing = rpcResult.error && /function|schema cache|accept_delivery_order|could not find/i.test(String(rpcResult.error.message || ""));
    if (rpcResult.error && !rpcMissing) return setLastAction(`Não foi possível aceitar a entrega: ${rpcResult.error.message || "verifique função accept_delivery_order."}`);
    if (rpcResult.data?.success === false) return setLastAction(rpcResult.data.message || "Entrega já aceita por outro entregador.");
    const patch = { status: DELIVERY_STATUS.OUT_FOR_DELIVERY, acceptedByUsername: loggedCourier?.username || "", acceptedByName: loggedCourier?.name || "", acceptedAt: new Date().toISOString(), pickedUpByUsername: loggedCourier?.username || "", pickedUpByName: loggedCourier?.name || "", pickedUpAt: new Date().toISOString() };
    const updated = await updateDeliveryInSupabase(id, patch);
    if (!updated) return;
    setDeliveries((previousDeliveries) =>
      previousDeliveries.map((delivery) => {
        if (delivery.id !== id) return delivery;
        if (!isDeliveryOrder(delivery)) return delivery;
        if (delivery.status !== DELIVERY_STATUS.WAITING_PICKUP) return delivery;
        return { ...delivery, ...patch };
      })
    );
    await resolveOrderNotifications(id, ["courier"]);
    addNotification("entrega_aceita", "Entrega aceita", `Pedido #${id} saiu para entrega com ${loggedCourier?.name || "entregador"}.`, "loja", id);
    addNotification("entrega_atribuida", "Entrega atribuída a você", `Você aceitou o pedido #${id}. Faça a entrega e marque como entregue ao chegar no cliente.`, "courier", id, { courierUsername: loggedCourier?.username });
    setLastAction(`Pedido #${id} saiu para entrega com ${loggedCourier?.name || "entregador"}.`);
  }

  async function requestDeliveryApproval(id) {
    const deliveryToApprove = deliveries.find((item) => item.id === id);
    const canRequestApproval = deliveryToApprove && isDeliveryOrder(deliveryToApprove) && deliveryToApprove.status === DELIVERY_STATUS.OUT_FOR_DELIVERY && canCourierControlDelivery(deliveryToApprove, loggedCourier?.username);
    if (!canRequestApproval) return setLastAction("Essa entrega ainda não pode pedir aprovação da loja.");
    const patch = {
      status: DELIVERY_STATUS.WAITING_OWNER_APPROVAL,
      deliveredByUsername: loggedCourier?.username || "",
      deliveredByName: loggedCourier?.name || "",
      deliveredAt: new Date().toISOString(),
      ownerApproved: false,
      motorcycleType: loggedCourier?.motorcycleType || "Moto própria",
      courierFee: calculateCourierFee(deliveryToApprove.deliveryFee, loggedCourier?.motorcycleType || "Moto própria"),
      storeFee: calculateStoreFee(deliveryToApprove.deliveryFee, loggedCourier?.motorcycleType || "Moto própria"),
    };
    const updated = await updateDeliveryInSupabase(id, patch);
    if (!updated) return;
    setDeliveries((previousDeliveries) =>
      previousDeliveries.map((delivery) => {
        if (delivery.id !== id) return delivery;
        if (!isDeliveryOrder(delivery)) return delivery;
        if (!canCourierControlDelivery(delivery, loggedCourier?.username)) return delivery;
        if (delivery.status !== DELIVERY_STATUS.OUT_FOR_DELIVERY) return delivery;
        return { ...delivery, ...patch };
      })
    );
    await resolveOrderNotifications(id, ["courier"]);
    addNotification("entrega_aguardando_aprovacao", "Entrega aguardando aprovação", `Pedido #${id} foi marcado como entregue por ${loggedCourier?.name || "entregador"}.`, "loja", id);
    setLastAction(`Pedido #${id} enviado para aprovação da loja.`);
  }



  async function refuseCourierDelivery(id) {
    const delivery = deliveries.find((item) => item.id === id);
    if (!delivery || !isDeliveryOrder(delivery)) return setLastAction("Entrega não encontrada.");
    if (delivery.status !== DELIVERY_STATUS.WAITING_PICKUP) return setLastAction("Só é possível recusar entrega ainda aguardando retirada.");
    const patch = { refusedByUsername: loggedCourier?.username || "", refusedAt: new Date().toISOString() };
    const updated = await updateDeliveryInSupabase(id, patch);
    if (!updated) return;
    setDeliveries((previousDeliveries) =>
      previousDeliveries.map((item) => (String(item.id) === String(id) ? { ...item, ...patch } : item))
    );
    await resolveOrderNotifications(id, ["courier"]);
    await auditAction("refuse_delivery", "orders", id, patch, null, "courier", loggedCourier?.username || "entregador");
    setLastAction(`Entrega #${id} recusada por ${loggedCourier?.name || "entregador"}. Ela saiu do seu painel.`);
  }

  async function updateDeliveryStatus(id, status) {
    const deliveryToUpdate = deliveries.find((item) => item.id === id);
    if (!deliveryToUpdate || !isDeliveryOrder(deliveryToUpdate)) return setLastAction("Entrega não encontrada.");
    if (needsStoreApprovalBeforeCourier(deliveryToUpdate)) return setLastAction("A loja precisa aprovar o pedido antes de liberar qualquer status.");
    if (deliveryToUpdate.status === DELIVERY_STATUS.CANCELLED || deliveryToUpdate.status === DELIVERY_STATUS.CONFIRMED_DELIVERED) return setLastAction("Essa entrega não pode mais ser alterada.");
    if (status === DELIVERY_STATUS.DELIVERY_PROBLEM && deliveryToUpdate.status !== DELIVERY_STATUS.OUT_FOR_DELIVERY) return setLastAction("Problema na entrega só pode ser registrado depois da saída da loja.");
    if (loggedCourier && !canCourierControlDelivery(deliveryToUpdate, loggedCourier.username)) return setLastAction("Essa entrega está vinculada a outro entregador.");

    const statusPatch = status === DELIVERY_STATUS.DELIVERY_PROBLEM ? { status, problemReason: "Problema informado pelo entregador", problemAt: new Date().toISOString() } : { status };
    const updated = await updateDeliveryInSupabase(id, statusPatch);
    if (!updated) return;
    setDeliveries((previousDeliveries) =>
      previousDeliveries.map((delivery) => {
        if (delivery.id !== id) return delivery;
        return { ...delivery, ...statusPatch };
      })
    );
    if (status === DELIVERY_STATUS.OUT_FOR_DELIVERY) {
      await resolveOrderNotifications(id, ["customer"]);
      addNotification("pedido_saiu", "Pedido saiu para entrega", `Seu pedido #${id} saiu da loja e está a caminho.`, "customer", id, { customerPhone: deliveryToUpdate.phone });
    }
    if (status === DELIVERY_STATUS.DELIVERY_PROBLEM) {
      addNotification("problema_entrega", "Problema na entrega", `Pedido #${id} foi marcado com problema por ${loggedCourier?.name || "entregador"}.`, "loja", id);
      addNotification("problema_registrado", "Problema registrado", `Problema do pedido #${id} enviado para a loja.`, "courier", id, { courierUsername: loggedCourier?.username });
    }
    setLastAction(`Pedido #${id} atualizado para: ${status}.`);
  }

  async function approveDelivery(id) {
    const currentDelivery = deliveries.find((item) => item.id === id);
    if (!currentDelivery) return setLastAction("Pedido não encontrado.");
    if (currentDelivery.status === DELIVERY_STATUS.CANCELLED) return setLastAction("Pedido cancelado não pode ser aprovado.");
    if (currentDelivery.status === DELIVERY_STATUS.CONFIRMED_DELIVERED) return setLastAction("Pedido já está entregue e confirmado.");

    if (currentDelivery.status === DELIVERY_STATUS.WAITING_STORE_APPROVAL) {
      if (!isCashOpen) return setLastAction("Abra o caixa antes de aprovar pedidos recebidos pelo cliente.");
      const approvedAt = new Date().toISOString();
      const dbPatch = {
        status: DELIVERY_STATUS.WAITING_PICKUP,
        cashSessionId: currentDelivery.cashSessionId || cashSession.id || "",
        needsStoreApproval: false,
        storeOrderApproved: true,
        approvedAt,
        courierUsername: currentDelivery.courierUsername || "ALL",
        courierName: currentDelivery.courierName || "Todos os motoboys",
      };
      const updated = await updateDeliveryInSupabase(id, dbPatch);
      if (!updated) {
        setLastAction("Não consegui aprovar no Supabase. Verifique a policy UPDATE da tabela orders.");
        return;
      }

      const localPatch = {
        status: DELIVERY_STATUS.WAITING_PICKUP,
        cashSessionId: currentDelivery.cashSessionId || cashSession.id || "",
        needsStoreApproval: false,
        storeOrderApproved: true,
        approvedAt,
      };
      setDeliveries((previousDeliveries) => previousDeliveries.map((delivery) => delivery.id === id ? { ...delivery, ...localPatch } : delivery));
      await resolveOrderNotifications(id, ["customer", "loja", "courier"]);
      addNotification("pedido_aprovado", "Pedido aprovado", `Pedido #${id} aprovado pela loja. Em breve um entregador fará a retirada.`, "customer", id, { customerPhone: currentDelivery.phone });
      addNotification("nova_entrega", "Nova entrega disponível", `Pedido #${id} aprovado pela loja e liberado para retirada.`, "courier", id);
      setLastAction(`Pedido #${id} aprovado e liberado para os entregadores.`);
      await loadDeliveries();
      return;
    }

    if (currentDelivery.status === DELIVERY_STATUS.WAITING_OWNER_APPROVAL) {
      const patch = {
        status: DELIVERY_STATUS.CONFIRMED_DELIVERED,
        ownerApproved: true,
        ownerApprovedAt: new Date().toISOString(),
        paymentStatus: PAYMENT_STATUS.PAID,
      };
      const updated = await updateDeliveryInSupabase(id, patch);
      if (!updated) {
        setLastAction("Não consegui aprovar a entrega no Supabase. Verifique a policy UPDATE da tabela orders.");
        return;
      }

      setDeliveries((previousDeliveries) =>
        previousDeliveries.map((delivery) => {
          if (delivery.id !== id) return delivery;
          if (delivery.status === DELIVERY_STATUS.CANCELLED || delivery.status === DELIVERY_STATUS.CONFIRMED_DELIVERED) return delivery;
          return { ...delivery, ...patch };
        })
      );
      await resolveOrderNotifications(id, ["customer", "loja", "courier"]);
      addNotification("pedido_entregue", "Pedido entregue", `Pedido #${id} foi entregue e finalizado pela loja. Obrigado pela preferência!`, "customer", id, { customerPhone: currentDelivery.phone });
      if (currentDelivery.deliveredByName) {
        addNotification("entrega_aprovada", "Entrega aprovada", `Pedido #${id} finalizado pela loja.`, "courier", id, { courierUsername: currentDelivery.deliveredByUsername || currentDelivery.pickedUpByUsername || currentDelivery.acceptedByUsername });
      }
      setLastAction(`Entrega #${id} aprovada e marcada como paga.`);
      await loadDeliveries();
      return;
    }

    setLastAction("Apenas pedidos aguardando aprovação ou entregas aguardando aprovação podem ser aprovados.");
  }

  async function updatePaymentStatus(id, paymentStatus) {
    const paymentKey = String(id);
    if (processingPaymentIds.includes(paymentKey)) return setLastAction("Aguarde, o pagamento já está sendo atualizado.");
    const delivery = deliveries.find((item) => String(item.id) === paymentKey);
    if (!delivery) return setLastAction("Pedido ou venda não encontrado.");
    const orderLabel = getOrderLabel(delivery);
    if (delivery?.status === DELIVERY_STATUS.WAITING_STORE_APPROVAL) return setLastAction("Aprove o pedido antes de confirmar recebimento.");
    if (delivery?.status === DELIVERY_STATUS.CANCELLED) return setLastAction(`${orderLabel === "venda" ? "Venda cancelada" : "Pedido cancelado"} não pode ter pagamento alterado.`);
    if (delivery?.paymentStatus === paymentStatus) return setLastAction(`Pagamento da ${orderLabel} #${id} já está como: ${paymentStatus}.`);

    const isConfirmingPayment = paymentStatus === PAYMENT_STATUS.PAID;
    if (isConfirmingPayment && !delivery.cashSessionId && !isCashOpen) {
      return setLastAction("Abra o caixa antes de confirmar recebimento deste pedido.");
    }

    const confirmMessage = isConfirmingPayment
      ? `Confirmar recebimento da ${orderLabel} #${id} no valor de ${money(delivery.value)}?`
      : `Reabrir recebimento da ${orderLabel} #${id}? O valor deixará de entrar como pago no fechamento.`;
    if (!window.confirm(confirmMessage)) return setLastAction("Alteração de pagamento cancelada.");

    setProcessingPaymentIds((previous) => [...previous, paymentKey]);
    try {
      const now = new Date().toISOString();
      const patch = {
        paymentStatus,
        cashSessionId: delivery.cashSessionId || (isConfirmingPayment ? cashSession.id || "" : delivery.cashSessionId || ""),
        paymentConfirmedAt: isConfirmingPayment ? now : "",
        paymentConfirmedBy: isConfirmingPayment ? getCurrentStoreUserName() || "loja" : "",
      };
      const updated = await updateDeliveryInSupabase(id, patch);
      if (!updated) return;

      if (isConfirmingPayment) {
        try {
          await saveOrderPayments({ ...delivery, ...patch });
          await loadOrderPayments();
        } catch (error) {
          console.error("Pagamento não salvo em order_payments:", error);
          setLastAction("Pagamento marcado no pedido, mas não consegui registrar no caixa. Verifique order_payments.");
        }
      } else {
        await cancelExistingOrderPayments(id, "reaberto pela loja");
        setOrderPayments((previous) => previous.map((payment) => String(payment.orderId) === paymentKey ? { ...payment, status: "cancelled", notes: "Pagamento reaberto pela loja" } : payment));
      }

      setDeliveries((previousDeliveries) => previousDeliveries.map((item) => (String(item.id) === paymentKey ? { ...item, ...patch } : item)));
      await auditAction("update_payment_status", "orders", id, { paymentStatus, value: delivery.value, cashSessionId: patch.cashSessionId || "" });
      setLastAction(`Pagamento da ${orderLabel} #${id} atualizado para: ${paymentStatus}.`);
    } finally {
      setProcessingPaymentIds((previous) => previous.filter((key) => key !== paymentKey));
    }
  }

  function requestCancelDelivery(id) {
    const delivery = deliveries.find((item) => item.id === id);
    if (!delivery) return;
    if (delivery.status === DELIVERY_STATUS.CANCELLED) return setLastAction("Esse pedido já está cancelado.");
    if (delivery.status === DELIVERY_STATUS.CONFIRMED_DELIVERED && isDeliveryOrder(delivery)) return setLastAction("Pedido entregue confirmado não pode ser cancelado pelo protótipo.");
    setPendingCancellation({ open: true, deliveryId: id, reason: CANCELLATION_REASONS[0], details: "", orderType: delivery.orderType || ORDER_TYPE.DELIVERY });
  }

  async function cancelDelivery() {
    const id = pendingCancellation.deliveryId;
    const delivery = deliveries.find((item) => item.id === id);
    if (!delivery) return setLastAction("Pedido não encontrado para cancelamento.");
    if (delivery.status === DELIVERY_STATUS.CANCELLED) return setLastAction("Esse pedido já está cancelado.");
    if (delivery.status === DELIVERY_STATUS.CONFIRMED_DELIVERED && isDeliveryOrder(delivery)) return setLastAction("Pedido entregue confirmado não pode ser cancelado.");

    const cancellationText = pendingCancellation.details.trim()
      ? `${pendingCancellation.reason}: ${pendingCancellation.details.trim()}`
      : pendingCancellation.reason;

    const patch = {
      status: DELIVERY_STATUS.CANCELLED,
      paymentStatus: PAYMENT_STATUS.PENDING,
      cancelledAt: new Date().toISOString(),
      cancellationReason: cancellationText,
      courierFee: 0,
      storeFee: 0,
    };

    const updated = await updateDeliveryInSupabase(id, patch);
    if (!updated) {
      setLastAction("Não consegui cancelar no Supabase. Verifique a policy UPDATE da tabela orders.");
      return;
    }

    setProducts((previousProducts) => {
      const nextProducts = restoreProductStock(previousProducts, delivery.items || []);
      persistProductStocks(nextProducts);
      return nextProducts;
    });
    setDeliveries((previousDeliveries) =>
      previousDeliveries.map((item) =>
        item.id === id
          ? { ...item, ...patch }
          : item
      )
    );
    setPendingCancellation({ open: false, deliveryId: null, reason: CANCELLATION_REASONS[0], details: "", orderType: ORDER_TYPE.DELIVERY });
    await cancelExistingOrderPayments(id, "cancelado junto com pedido");
    await saveStockMovements(delivery, "cancel");
    await auditAction("cancel_order", "orders", id, { reason: cancellationText, value: delivery.value, cashSessionId: delivery.cashSessionId || "" }, delivery);
    if (isDeliveryOrder(delivery)) {
      await resolveOrderNotifications(id, ["customer", "loja", "courier"]);
      addNotification("pedido_cancelado", "Pedido cancelado", `Pedido #${id} cancelado. Motivo: ${cancellationText}.`, "loja", id);
      addNotification("pedido_cancelado_cliente", "Pedido cancelado", `Pedido #${id} foi cancelado pela loja. Motivo: ${cancellationText}.`, "customer", id, { customerPhone: delivery.phone });
      if (delivery.pickedUpByUsername || delivery.acceptedByUsername) {
        addNotification("entrega_cancelada", "Entrega cancelada", `Pedido #${id} foi cancelado pela loja.`, "courier", id, { courierUsername: delivery.pickedUpByUsername || delivery.acceptedByUsername });
      }
    }
    setLastAction(`${isCounterOrder(delivery) ? "Venda" : "Pedido"} #${id} cancelado, motivo registrado e estoque devolvido automaticamente.`);
    await loadDeliveries();
  }

  async function closeCashRegister() {
    if (!cashSession.isOpen) return setLastAction("Abra o caixa antes de fechar.");
    if (closingCashCounted === "") return setLastAction("Informe quanto dinheiro foi contado na gaveta para fechar o caixa.");
    const countedCash = Math.max(0, Number(closingCashCounted || 0));
    const latestPayments = await fetchOrderPayments();
    const report = buildCashClosingReport(deliveries, cashSession, latestPayments);
    const difference = countedCash - report.expectedDrawerCash;
    const closedAt = new Date().toISOString();
    const record = {
      id: Date.now(),
      createdAt: closedAt,
      openedAt: cashSession.openedAt || "",
      closedAt,
      countedCash,
      difference,
      ...report,
      sangrias: cashSession.sangrias || [],
    };
    try {
      await persistCashClosing(record);
    } catch (error) {
      return setLastAction(`Caixa não fechado: ${error.message || "não salvou no Supabase."}`);
    }
    printCashClosingReceipt(report, countedCash, difference);
    setCashSession({ isOpen: false, id: "", openedAt: "", closedAt, openingAmount: 0, sangrias: [] });
    setClosingCashCounted("");
    setLastAction(`Caixa fechado no Supabase. Esperado ${money(report.expectedDrawerCash)}, contado ${money(countedCash)}, diferença ${money(difference)}.`);
    await loadCashData();
  }

  function getTabCustomerKey(tabOrDraft) {
    const phone = onlyPhoneNumbers(tabOrDraft?.phone || "");
    if (phone) return `phone:${phone}`;
    return `name:${String(tabOrDraft?.customerName || "").trim().toLowerCase()}`;
  }

  function getCurrentTabCreditLimit(tabOrDraft) {
    const key = getTabCustomerKey(tabOrDraft);
    return toSafeNumber(tabOrDraft?.creditLimit, toSafeNumber(tabCreditLimits[key], DEFAULT_TAB_CREDIT_LIMIT));
  }

  function getTabCreditUsed(tab) {
    return buildOrderTotal(tab?.items || []);
  }

  function getTabCreditRemaining(tab) {
    return Math.max(0, getCurrentTabCreditLimit(tab) - getTabCreditUsed(tab));
  }

  function getTabProductResults(tabId) {
    const term = String(tabProductSearchByTab[tabId] || "").toLowerCase().trim();
    const availableProducts = getActiveProducts(products);
    if (!term) return availableProducts;
    return availableProducts.filter((product) => `${product.name || ""} ${product.barcode || ""} ${product.category || ""}`.toLowerCase().includes(term));
  }

  async function applyManualTabLimit(tabId) {
    const tab = tabsAccounts.find((item) => item.id === tabId);
    if (!tab) return setLastAction("Comanda não encontrada.");
    const nextLimit = toSafeNumber(tabLimitDrafts[tabId], NaN);
    if (!Number.isFinite(nextLimit) || nextLimit < 0) return setLastAction("Informe um limite válido para a comanda.");
    const used = getTabCreditUsed(tab);
    if (nextLimit < used) return setLastAction(`Limite não alterado: a comanda já tem ${money(used)} em produtos.`);
    const key = getTabCustomerKey(tab);
    const nextTab = { ...tab, creditLimit: nextLimit };
    try { await persistTabAccount(nextTab, "open"); } catch (error) { return setLastAction(`Limite não salvo no Supabase: ${error.message || "verifique tab_accounts."}`); }
    setTabCreditLimits((previous) => ({ ...previous, [key]: nextLimit }));
    setTabsAccounts((previous) => previous.map((item) => item.id === tabId ? nextTab : item));
    setLastAction(`Limite da comanda de ${tab.customerName} ajustado no Supabase para ${money(nextLimit)}.`);
  }

  function adjustTabCreditLimitAfterClose(tab, total, payment) {
    const key = getTabCustomerKey(tab);
    const currentLimit = getCurrentTabCreditLimit(tab);
    const openedAt = tab?.openedAt ? new Date(tab.openedAt).getTime() : Date.now();
    const hoursOpen = Math.max(0, (Date.now() - openedAt) / 36e5);
    let nextLimit = currentLimit;
    if (payment === "Fiado/anotado") {
      nextLimit = Math.max(DEFAULT_TAB_CREDIT_LIMIT, currentLimit - TAB_DELAY_PENALTY);
    } else if (hoursOpen > TAB_DELAY_LIMIT_HOURS) {
      nextLimit = Math.max(DEFAULT_TAB_CREDIT_LIMIT, currentLimit - TAB_DELAY_PENALTY);
    } else {
      nextLimit = Math.max(DEFAULT_TAB_CREDIT_LIMIT, currentLimit + TAB_FAST_PAYMENT_BONUS);
    }
    setTabCreditLimits((previous) => ({ ...previous, [key]: nextLimit }));
    return nextLimit;
  }

  async function createTabAccount() {
    if (!isCashOpen) return setLastAction("Abra o caixa antes de abrir uma comanda.");
    const name = tabDraft.customerName.trim();
    if (!name) return setLastAction("Informe o nome do cliente da comanda.");
    const phone = tabDraft.phone ? formatBrazilMobilePhone(tabDraft.phone) : "";
    const key = getTabCustomerKey({ customerName: name, phone });
    const creditLimit = toSafeNumber(tabDraft.creditLimit, toSafeNumber(tabCreditLimits[key], DEFAULT_TAB_CREDIT_LIMIT));
    if (creditLimit < 0) return setLastAction("Informe um limite válido para a comanda.");
    const tab = { id: Date.now(), customerName: name, phone, creditLimit, payment: tabDraft.payment || "Dinheiro", items: [], openedAt: new Date().toISOString(), cashSessionId: cashSession.id || "", notes: "Comanda/fiado" };
    try { await persistTabAccount(tab, "open"); } catch (error) { return setLastAction(`Comanda não aberta no Supabase: ${error.message || "verifique tab_accounts."}`); }
    setTabCreditLimits((previous) => ({ ...previous, [key]: creditLimit }));
    setTabsAccounts((previous) => [tab, ...previous]);
    setTabDraft({ customerName: "", phone: "", creditLimit: DEFAULT_TAB_CREDIT_LIMIT });
    setLastAction(`Comanda aberta no Supabase para ${name} com limite de ${money(creditLimit)}.`);
  }

  async function addProductToTab(tabId, product, quantity = 1) {
    if (!isCashOpen) return setLastAction("Abra o caixa antes de adicionar itens à comanda.");
    if (!product || !product.active) return setLastAction("Produto indisponível para comanda.");
    const safeQuantity = toPositiveInteger(quantity, 1);
    const tab = tabsAccounts.find((item) => item.id === tabId);
    if (!tab) return setLastAction("Comanda não encontrada.");
    const existing = (tab.items || []).find((item) => Number(item.id) === Number(product.id));
    const nextItems = existing
      ? (tab.items || []).map((item) => Number(item.id) === Number(product.id) ? { ...item, quantity: toPositiveInteger(item.quantity, 1) + safeQuantity } : item)
      : [...(tab.items || []), { id: product.id, name: product.name, price: Number(product.price || 0), quantity: safeQuantity, barcode: product.barcode }];
    const validation = validateOrderItems(nextItems, products);
    if (!validation.valid) return setLastAction(validation.message);
    const nextTotal = buildOrderTotal(nextItems);
    const currentLimit = getCurrentTabCreditLimit(tab);
    if (nextTotal > currentLimit) return setLastAction(`Limite da comanda excedido. Limite: ${money(currentLimit)} • total tentado: ${money(nextTotal)}.`);
    const nextTab = { ...tab, items: nextItems };
    try { await persistTabAccount(nextTab, "open"); } catch (error) { return setLastAction(`Item não salvo na comanda: ${error.message || "verifique tab_accounts."}`); }
    setTabsAccounts((previous) => previous.map((item) => item.id === tabId ? nextTab : item));
    setLastAction(`${safeQuantity}x ${product.name} adicionado à comanda de ${tab.customerName}.`);
  }


  async function updateTabItemQuantity(tabId, productId, quantity) {
    const safeQuantity = toPositiveInteger(quantity, 1);
    const tab = tabsAccounts.find((item) => item.id === tabId);
    if (!tab) return setLastAction("Comanda não encontrada.");
    const nextItems = (tab.items || []).map((item) => Number(item.id) === Number(productId) ? { ...item, quantity: safeQuantity } : item);
    const validation = validateOrderItems(nextItems, products);
    if (!validation.valid) return setLastAction(validation.message);
    const nextTotal = buildOrderTotal(nextItems);
    const currentLimit = getCurrentTabCreditLimit(tab);
    if (nextTotal > currentLimit) return setLastAction(`Limite da comanda excedido. Limite: ${money(currentLimit)} • total tentado: ${money(nextTotal)}.`);
    const nextTab = { ...tab, items: nextItems };
    try { await persistTabAccount(nextTab, "open"); } catch (error) { return setLastAction(`Quantidade não salva no Supabase: ${error.message || "verifique tab_accounts."}`); }
    setTabsAccounts((previous) => previous.map((item) => item.id === tabId ? nextTab : item));
  }


  async function removeTabItem(tabId, productId) {
    const tab = tabsAccounts.find((item) => item.id === tabId);
    if (!tab) return setLastAction("Comanda não encontrada.");
    const nextTab = { ...tab, items: (tab.items || []).filter((item) => Number(item.id) !== Number(productId)) };
    try { await persistTabAccount(nextTab, "open"); } catch (error) { return setLastAction(`Item não removido no Supabase: ${error.message || "verifique tab_accounts."}`); }
    setTabsAccounts((previous) => previous.map((item) => item.id === tabId ? nextTab : item));
  }

  function startClosingTab(tabId) {
    setClosingTabId(tabId);
    setTabClosingPayment("Dinheiro");
    setTabClosingChangeFor("");
    setTabClosingMixedPayment(createEmptyMixedPayment());
    setTabClosingStorePassword("");
  }

  function cancelClosingTab() {
    setClosingTabId(null);
    setTabClosingPayment("Dinheiro");
    setTabClosingChangeFor("");
    setTabClosingMixedPayment(createEmptyMixedPayment());
    setTabClosingStorePassword("");
  }

  async function addSelectedProductToTab(tabId) {
    const term = String(tabProductSearchByTab[tabId] || "").trim().toLowerCase();
    if (!term) return setLastAction("Pesquise o produto por nome ou código de barras.");
    const matches = getTabProductResults(tabId);
    const product = matches.find((item) => String(item.barcode || "").toLowerCase() === term) || matches[0];
    if (!product) return setLastAction("Nenhum produto encontrado para essa busca.");
    const quantity = toPositiveInteger(tabProductQuantityByTab[tabId], 1);
    await addProductToTab(tabId, product, quantity);
    setTabProductSearchByTab((previous) => ({ ...previous, [tabId]: "" }));
    setTabProductQuantityByTab((previous) => ({ ...previous, [tabId]: 1 }));
  }


  async function closeTabAccount(tabId) {
    if (!isCashOpen) return setLastAction("Abra o caixa antes de fechar comanda.");
    const typedStorePassword = String(tabClosingStorePassword || "").trim();
    const currentStorePassword = String(storeSession?.password || password || "").trim();
    if (!typedStorePassword || (currentStorePassword && typedStorePassword !== currentStorePassword) || (!currentStorePassword && !isValidLogin(login || "loja", typedStorePassword))) {
      return setLastAction("Senha da loja incorreta. Use a mesma senha do login da loja para fechar a comanda.");
    }
    const preOpenedPrintWindow = window.open("about:blank", "_blank", "width=420,height=760");
    if (!preOpenedPrintWindow) return setLastAction("Navegador bloqueou a impressão da comanda. Libere pop-ups e tente novamente.");
    const tab = tabsAccounts.find((item) => item.id === tabId);
    if (!tab) { preOpenedPrintWindow.close(); return setLastAction("Comanda não encontrada."); }
    const validation = validateOrderItems(tab.items, products);
    if (!validation.valid) { preOpenedPrintWindow.close(); return setLastAction(validation.message); }
    const syncedItems = syncOrderItemsWithProducts(tab.items, products);
    const total = buildOrderTotal(syncedItems);
    if (tabClosingPayment === "Misto" && !isMixedPaymentBalanced(tabClosingMixedPayment, total)) {
      preOpenedPrintWindow.close();
      return setLastAction(`Pagamento misto da comanda precisa fechar ${money(total)}. Informado: ${money(getMixedPaymentTotal(tabClosingMixedPayment))}.`);
    }
    if (tabClosingPayment === "Dinheiro" && tabClosingChangeFor && toSafeMoneyNumber(tabClosingChangeFor, 0) < total) {
      preOpenedPrintWindow.close();
      return setLastAction(`Troco da comanda inválido: recebido ${money(tabClosingChangeFor)} é menor que ${money(total)}.`);
    }
    const mixedPaymentDetails = tabClosingPayment === "Misto" ? getMixedPaymentDetails(tabClosingMixedPayment) : "";
    const paymentStatus = tabClosingPayment === "Fiado/anotado" ? PAYMENT_STATUS.STORE_CREDIT : PAYMENT_STATUS.PAID;
    const closedOrder = {
      id: Date.now(),
      cashSessionId: cashSession.id || "",
      originType: "counter",
      orderType: ORDER_TYPE.COUNTER,
      client: tab.customerName,
      phone: tab.phone,
      address: "Comanda/fiado",
      payment: tabClosingPayment,
      paymentStatus,
      changeFor: tabClosingPayment === "Dinheiro" ? tabClosingChangeFor : "",
      mixedPayment: tabClosingPayment === "Misto" ? tabClosingMixedPayment : createEmptyMixedPayment(),
      mixedPaymentDetails,
      productsTotal: total,
      deliveryFee: 0,
      discount: 0,
      courierFee: 0,
      storeFee: 0,
      motorcycleType: "",
      value: total,
      status: DELIVERY_STATUS.CONFIRMED_DELIVERED,
      reference: "Comanda fechada",
      courierUsername: "COMANDA",
      courierName: "Comanda",
      notes: "Comanda fechada pelo painel de fiados",
      items: syncedItems,
      pickedUpByUsername: "",
      pickedUpByName: "",
      pickedUpAt: "",
      deliveredByUsername: "",
      deliveredByName: "Comanda",
      deliveredAt: new Date().toISOString(),
      ownerApproved: true,
      ownerApprovedAt: new Date().toISOString(),
      launchedAt: tab.openedAt || new Date().toISOString(),
      closedAt: new Date().toISOString(),
    };
    const nextLimit = adjustTabCreditLimitAfterClose(tab, total, tabClosingPayment);
    let savedClosedOrder;
    try {
      savedClosedOrder = await saveDeliveryToSupabase(closedOrder);
      await persistTabAccount({ ...tab, closedAt: closedOrder.closedAt, payment: tabClosingPayment, items: syncedItems }, "closed");
    } catch (error) {
      preOpenedPrintWindow.close();
      return setLastAction(`Comanda não salva no Supabase: ${error.message || "verifique Supabase/tab_accounts."}`);
    }

    setDeliveries((previous) => [savedClosedOrder, ...previous]);
    setProducts((previousProducts) => {
      const nextProducts = reduceProductStock(previousProducts, syncedItems);
      persistProductStocks(nextProducts);
      return nextProducts;
    });
    setTabsAccounts((previous) => previous.filter((item) => item.id !== tabId));
    cancelClosingTab();
    printDeliveryReceipt(savedClosedOrder, 2, { printWindow: preOpenedPrintWindow });
    setLastAction(`Comanda de ${tab.customerName} fechada em ${money(total)} e salva no Supabase. Novo limite sugerido: ${money(nextLimit)}. Foram abertas 2 vias para impressão.`);
  }


  function getPrintCloseDelaySecondsFromValue(value) {
    return clampPrintCloseDelaySeconds(value);
  }

  function updateStoreSetting(field, value) {
    const moneyFields = ["defaultDeliveryFee", "minimumOrderValue"];
    const printCopyFields = ["customerOrderPrintCopies", "manualReprintCopies"];
    const finalValue = moneyFields.includes(field)
      ? normalizeDeliveryFee(value)
      : printCopyFields.includes(field)
        ? getSafePrintCopies(value, field === "customerOrderPrintCopies" ? 2 : 1)
        : field === "printCloseDelaySeconds"
          ? getPrintCloseDelaySecondsFromValue(value)
          : value;
    setStoreSettings((previousSettings) => ({ ...previousSettings, [field]: finalValue }));
    if (field === "defaultDeliveryFee") {
      setDeliveryDraft((previousDraft) => ({ ...previousDraft, deliveryFee: finalValue }));
    }
  }

  function updateStoreScheduleDay(day, field, value) {
    setStoreSettings((previousSettings) => {
      const nextSchedule = normalizeStoreSchedule(previousSettings.schedule).map((item) => (
        Number(item.day) === Number(day)
          ? { ...item, [field]: field === "closed" ? value === true : value }
          : item
      ));
      return {
        ...previousSettings,
        schedule: nextSchedule,
        openingHours: buildOpeningHoursSummary(nextSchedule),
      };
    });
  }

  function resetStoreSettingsToDefault() {
    const confirmed = window.confirm("Restaurar as configurações da loja para o padrão inicial? Taxa, pedido mínimo, horários, WhatsApp e impressão serão redefinidos neste navegador.");
    if (!confirmed) return;
    const defaultSettings = sanitizeStoreSettings(initialStoreSettings);
    setStoreSettings(defaultSettings);
    setDeliveryDraft((previousDraft) => ({ ...previousDraft, deliveryFee: defaultSettings.defaultDeliveryFee }));
    setLastAction("Configurações da loja restauradas para o padrão inicial e serão sincronizadas no Supabase quando possível.");
  }

  function downloadFile(filename, content, type = "text/plain;charset=utf-8") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadJsonFile(filename, payload) {
    downloadFile(filename, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
  }

  function csvValue(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }

  function downloadCsvFile(filename, headers, rows) {
    const csv = [headers, ...rows].map((row) => row.map(csvValue).join(";")).join("\n");
    downloadFile(filename, `\uFEFF${csv}`, "text/csv;charset=utf-8");
  }

  function buildReportFileDate() {
    const start = reportRange.startDate || "inicio";
    const end = reportRange.endDate || "hoje";
    return `${start}_a_${end}`;
  }

  function exportOperationalBackup() {
    const createdAt = new Date().toISOString();
    const backup = {
      app: "Barbosas Delivery",
      version: "fase-16-backup-operacional",
      createdAt,
      storeSettings: sanitizeStoreSettings(storeSettings),
      products,
      productGroups,
      promotions,
      kits,
      clients,
      couriers,
      deliveries,
      notifications,
      orderPayments,
      cashSession,
      cashClosings,
      tabsAccounts,
      tabCreditLimits,
      summary: {
        products: products.length,
        clients: clients.length,
        couriers: couriers.length,
        deliveries: deliveries.length,
        notifications: notifications.length,
        openTabs: tabsAccounts.length,
      },
    };
    const safeDate = createdAt.slice(0, 19).replace(/[:T]/g, "-");
    downloadJsonFile(`barbosas-delivery-backup-${safeDate}.json`, backup);
    setLastAction("Backup operacional baixado em JSON. Guarde esse arquivo em local seguro.");
  }

  function openBackupImportDialog() {
    backupFileInputRef.current?.click();
  }

  function resetOperationalDraftsAfterBackupRestore(restoredSettings) {
    setCustomerCart([]);
    setCustomerOrderConfirmation(null);
    setShowCustomerCheckout(false);
    setCustomerVariantPicker({ open: false, product: null, quantities: {} });
    setDeliveryDraft({ clientId: "", payment: "Pix", changeFor: "", notes: "", items: [], deliveryFee: restoredSettings.defaultDeliveryFee, discount: 0 });
    setCounterDraft({ customerName: "Cliente balcão", phone: "", payment: "Pix", changeFor: "", notes: "", items: [], discount: 0 });
    setTabDraft({ customerName: "", phone: "", creditLimit: DEFAULT_TAB_CREDIT_LIMIT });
    setEditingProductId(null);
    setEditingClientId(null);
    setEditingCourierId(null);
    setEditingPromotionId(null);
    setEditingKitId(null);
    setClosingTabId(null);
    setPendingCancellation({ open: false, deliveryId: null, reason: CANCELLATION_REASONS[0], details: "", orderType: ORDER_TYPE.DELIVERY });
  }

  async function importOperationalBackup(file) {
    if (!file) return;
    try {
      const rawContent = await file.text();
      const parsedBackup = JSON.parse(rawContent);
      if (!parsedBackup || parsedBackup.app !== "Barbosas Delivery") {
        setLastAction("Arquivo de backup inválido. Selecione um backup gerado pelo Barbosa's Delivery.");
        return;
      }

      const summary = parsedBackup.summary || {};
      const confirmed = window.confirm(
        `Restaurar este backup?\n\n` +
        `Criado em: ${parsedBackup.createdAt || "data não informada"}\n` +
        `Produtos: ${summary.products ?? (Array.isArray(parsedBackup.products) ? parsedBackup.products.length : 0)}\n` +
        `Clientes: ${summary.clients ?? (Array.isArray(parsedBackup.clients) ? parsedBackup.clients.length : 0)}\n` +
        `Pedidos: ${summary.deliveries ?? (Array.isArray(parsedBackup.deliveries) ? parsedBackup.deliveries.length : 0)}\n\n` +
        "Isso substituirá os dados carregados na tela atual. Baixe um backup novo antes de continuar se ainda não fez."
      );
      if (!confirmed) return;

      const restoredSettings = sanitizeStoreSettings(parsedBackup.storeSettings || initialStoreSettings);
      setStoreSettings(restoredSettings);
      if (Array.isArray(parsedBackup.products)) setProducts(parsedBackup.products);
      if (Array.isArray(parsedBackup.productGroups)) setProductGroups(parsedBackup.productGroups);
      if (Array.isArray(parsedBackup.promotions)) setPromotions(parsedBackup.promotions);
      if (Array.isArray(parsedBackup.kits)) setKits(parsedBackup.kits);
      if (Array.isArray(parsedBackup.clients)) setClients(parsedBackup.clients);
      if (Array.isArray(parsedBackup.couriers)) setCouriers(parsedBackup.couriers);
      if (Array.isArray(parsedBackup.deliveries)) setDeliveries(parsedBackup.deliveries);
      if (Array.isArray(parsedBackup.notifications)) setNotifications(parsedBackup.notifications);
      if (Array.isArray(parsedBackup.orderPayments)) setOrderPayments(parsedBackup.orderPayments);
      if (parsedBackup.cashSession && typeof parsedBackup.cashSession === "object") setCashSession(parsedBackup.cashSession);
      if (Array.isArray(parsedBackup.cashClosings)) setCashClosings(parsedBackup.cashClosings);
      if (Array.isArray(parsedBackup.tabsAccounts)) setTabsAccounts(parsedBackup.tabsAccounts);
      if (parsedBackup.tabCreditLimits && typeof parsedBackup.tabCreditLimits === "object") setTabCreditLimits(parsedBackup.tabCreditLimits);

      resetOperationalDraftsAfterBackupRestore(restoredSettings);
      setLastAction("Backup operacional restaurado na tela atual. Confira os dados antes de continuar usando o sistema.");
    } catch (error) {
      setLastAction(`Backup não restaurado: ${error.message || "arquivo inválido ou corrompido."}`);
    }
  }

  function handleBackupFileSelected(event) {
    const file = event.target.files?.[0];
    importOperationalBackup(file);
    event.target.value = "";
  }

  async function confirmManualDelivery(id) {
    const delivery = deliveries.find((item) => item.id === id);
    if (!delivery) return;
    if (!isDeliveryOrder(delivery)) return setLastAction("Venda de balcão não precisa de confirmação de entrega.");
    if (delivery.status === DELIVERY_STATUS.CANCELLED) return setLastAction("Pedido cancelado não pode ser confirmado.");
    if (delivery.status === DELIVERY_STATUS.CONFIRMED_DELIVERED) return setLastAction("Pedido já está confirmado.");

    const patch = {
      status: DELIVERY_STATUS.CONFIRMED_DELIVERED,
      ownerApproved: true,
      ownerApprovedAt: new Date().toISOString(),
      deliveredAt: delivery.deliveredAt || new Date().toISOString(),
      motorcycleType: delivery.motorcycleType || "Confirmação manual",
      courierFee: delivery.deliveredByUsername ? delivery.courierFee : 0,
      storeFee: delivery.deliveredByUsername ? delivery.storeFee : 0,
      paymentStatus: PAYMENT_STATUS.PAID,
      finalizedAt: new Date().toISOString(),
      finalizedBy: getCurrentStoreUserName(),
    };
    const updated = await updateDeliveryInSupabase(id, patch);
    if (!updated) return;
    setDeliveries((previousDeliveries) =>
      previousDeliveries.map((item) =>
        item.id === id
          ? { ...item, ...patch }
          : item
      )
    );
    await resolveOrderNotifications(id, ["customer", "loja", "courier"]);
    setLastAction(`Pedido #${id} finalizado pela loja.`);
  }

  const tabs = [
    { id: "dashboard", label: "Painel", icon: "chart" },
    { id: "products", label: "Produtos", icon: "package" },
    { id: "kits", label: "Kits", icon: "package" },
    { id: "promos", label: "Promoções", icon: "percent" },
    { id: "deliveries", label: "PDV Entregas", icon: "truck" },
    { id: "counter", label: "PDV Balcão", icon: "money" },
    { id: "cash", label: "Fechamento", icon: "money" },
    { id: "tabs", label: "Fiados/Comandas", icon: "users" },
    { id: "settings", label: "Configurações", icon: "save" },
    { id: "clients", label: "Clientes", icon: "users" },
    { id: "couriers", label: "Entregadores", icon: "truck" },
  ];

  if (loggedCourier) {
    return (
      <div className="min-h-screen bg-zinc-100 text-zinc-950 pb-24 md:pb-0">
        <header className="bg-zinc-950 text-white px-4 md:px-8 py-4 md:py-5 sticky top-0 z-20 shadow-xl">
          <div className="max-w-md md:max-w-5xl mx-auto flex flex-row md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-white text-zinc-950 flex items-center justify-center text-xl"><Icon name="truck" /></div>
              <div>
                <h1 className="text-lg md:text-xl font-bold">Painel do Entregador</h1>
                <p className="text-xs text-zinc-400">{loggedCourier.name} • {loggedCourier.username} • 🔔 {courierUnreadNotifications} novas</p>
              </div>
            </div>
            <Button onClick={() => { setLoggedCourier(null); setCourierPassword(""); }} variant="secondary" className="rounded-2xl px-3 md:px-4"><span className="mr-2"><Icon name="logout" /></span>Sair</Button>
          </div>
        </header>

        <main className="max-w-md md:max-w-5xl mx-auto p-3 md:p-8 space-y-5 md:space-y-6">
          {courierNotifications.length > 0 && (
            <NotificationPanel
              title={`Notificações dos entregadores (${courierUnreadNotifications} novas)`}
              notifications={courierNotifications}
              onMarkRead={() => markNotificationsRead("courier", loggedCourier?.username)}
            />
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Metric title="Entregas disponíveis" value={waitingPickupDeliveries.length} icon="truck" />
            <Metric title="Pendentes" value={courierPendingDeliveries.length} icon="calendar" />
            <Metric title="Confirmadas" value={loggedCourierDeliveries.filter((delivery) => delivery.status === DELIVERY_STATUS.CONFIRMED_DELIVERED).length} icon="check" />
            <Metric title="Alertas" value={courierUnreadNotifications} icon="bell" />
          </div>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <Title title="Entregas disponíveis" subtitle="Fluxo rápido: aceitar na loja, abrir rota/WhatsApp e marcar entregue quando chegar ao cliente." />
            <Button onClick={loadDeliveries} variant="secondary" className="rounded-2xl">Atualizar entregas</Button>
          </div>
          {courierPendingDeliveries.length === 0 && <CardBox><p className="text-sm text-zinc-500">Nenhuma entrega pendente no momento.</p></CardBox>}

          <div className="grid gap-4">
            {courierPendingDeliveries.map((delivery) => (
              <Card key={delivery.id} className="rounded-3xl border-zinc-200 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-lg">Pedido #{delivery.id}</span>
                        <span className={`text-xs px-3 py-1 rounded-full ${getStatusClass(delivery.status)}`}>{delivery.status}</span>
                      </div>
                      <p className="text-sm text-zinc-700"><b>Cliente:</b> {delivery.client}</p>
                      <p className="text-sm text-zinc-700"><b>Telefone:</b> {formatBrazilMobilePhone(delivery.phone)}</p>
                      <p className="text-sm text-zinc-700"><b>Endereço:</b> {delivery.address}</p>
                      <p className="text-sm text-zinc-500"><b>Referência:</b> {delivery.reference || "-"}</p>
                      <div className="grid grid-cols-2 gap-2 my-3">
                        <a href={buildMapsUrl(delivery.address)} target="_blank" rel="noreferrer" className="rounded-2xl bg-blue-50 border border-blue-100 px-3 py-3 text-center text-sm font-black text-blue-700">Abrir rota</a>
                        <a href={buildWhatsAppUrl(delivery.phone, `Olá ${delivery.client}, sou o entregador da Barbosa's. Estou com seu pedido #${delivery.id}.`)} target="_blank" rel="noreferrer" className="rounded-2xl bg-emerald-50 border border-emerald-100 px-3 py-3 text-center text-sm font-black text-emerald-700">WhatsApp</a>
                      </div>
                      <p className="text-sm text-zinc-500"><b>Pagamento:</b> {getPaymentLabel(delivery.payment, delivery.changeFor)}</p>
                      {delivery.pickedUpByName && <p className="text-sm text-zinc-500"><b>Retirado por:</b> {delivery.pickedUpByName}</p>}
                      {delivery.deliveredByName && <p className="text-sm text-blue-700"><b>Entrega informada por:</b> {delivery.deliveredByName}</p>}
                      {delivery.items && <p className="text-xs text-zinc-500 mt-2">Itens: {delivery.items.map((item) => item.quantity + "x " + item.name).join(", ")}</p>}
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-sm text-zinc-500">Total com entrega</p>
                      <p className="text-2xl font-black">{money(delivery.value)}</p>
                      <p className="text-xs text-zinc-500">Taxa de entrega: {money(normalizeDeliveryFee(delivery.deliveryFee))}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    <Button onClick={() => runCourierAction(delivery.id, "aceite", () => markCourierPickedUp(delivery.id))} disabled={isCourierActionBusy(delivery.id) || delivery.status !== DELIVERY_STATUS.WAITING_PICKUP} variant="secondary" className="rounded-2xl py-4 text-sm">{isCourierActionBusy(delivery.id) ? "Aguarde..." : "Aceitar e retirar"}</Button>
                    <Button onClick={() => runCourierAction(delivery.id, "recusa", () => refuseCourierDelivery(delivery.id))} disabled={isCourierActionBusy(delivery.id) || delivery.status !== DELIVERY_STATUS.WAITING_PICKUP} variant="secondary" className="rounded-2xl py-4 text-sm">Recusar</Button>
                    <Button onClick={() => runCourierAction(delivery.id, "problema", () => updateDeliveryStatus(delivery.id, DELIVERY_STATUS.DELIVERY_PROBLEM))} disabled={isCourierActionBusy(delivery.id) || delivery.status !== DELIVERY_STATUS.OUT_FOR_DELIVERY || delivery.status === DELIVERY_STATUS.CONFIRMED_DELIVERED || delivery.status === DELIVERY_STATUS.CANCELLED || !canCourierControlDelivery(delivery, loggedCourier?.username)} variant="secondary" className="rounded-2xl py-4 text-sm">Problema</Button>
                    <Button onClick={() => runCourierAction(delivery.id, "entrega", () => requestDeliveryApproval(delivery.id))} disabled={isCourierActionBusy(delivery.id) || delivery.status !== DELIVERY_STATUS.OUT_FOR_DELIVERY || delivery.status === DELIVERY_STATUS.CANCELLED || !canCourierControlDelivery(delivery, loggedCourier?.username)} className="rounded-2xl bg-zinc-950 hover:bg-zinc-800 py-4 text-sm">Marcar entregue</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!isLogged) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-start md:items-center justify-center p-3 md:p-4 overflow-x-hidden">
        <div className={customerSubmitted ? "w-full max-w-6xl" : "w-full max-w-2xl"}>
          <Card className="bg-zinc-900 border-zinc-800 shadow-2xl rounded-3xl">
            <CardContent className="p-4 sm:p-6 md:p-8">
              <div className={customerSubmitted ? "flex flex-col md:flex-row md:items-center gap-4 mb-8 justify-center" : "flex flex-col md:flex-row md:items-center gap-4 mb-8 md:justify-between"}>
                <div className="flex items-center gap-3"><StoreLogo size="h-14 w-14" /><div><h1 className="text-2xl font-bold text-white">Barbosas Delivery</h1><p className="text-zinc-400 text-sm">{customerSubmitted ? `${customerForm.street}, ${customerForm.number} - ${customerForm.district}` : "Informe seus dados para continuar"}</p></div>{customerSubmitted && <button type="button" onClick={() => { setCustomerSubmitted(false); setShowCustomerCheckout(false); setShowCustomerNeedMoreMessage(false); }} className="ml-2 rounded-xl border border-white/20 bg-white px-3 py-2 text-xs font-black text-zinc-950 shadow-sm hover:bg-zinc-100">Corrigir dados</button>}</div>
                {!customerSubmitted && (
                  <div className="grid grid-cols-3 w-full md:w-auto rounded-2xl bg-zinc-800 p-1 border border-zinc-700">
                    <button type="button" onClick={() => setEntryMode("customer")} className={`px-4 py-2 rounded-xl text-sm font-semibold ${entryMode === "customer" ? "bg-white text-zinc-950" : "text-zinc-300"}`}>Cliente</button>
                    <button type="button" onClick={() => setEntryMode("loja")} className={`px-4 py-2 rounded-xl text-sm font-semibold ${entryMode === "loja" ? "bg-white text-zinc-950" : "text-zinc-300"}`}>Loja</button>
                    <button type="button" onClick={() => setEntryMode("courier")} className={`px-4 py-2 rounded-xl text-sm font-semibold ${entryMode === "courier" ? "bg-white text-zinc-950" : "text-zinc-300"}`}>Entregador</button>
                  </div>
                )}
              </div>

              {entryMode === "customer" && !customerSubmitted && (
                <form onSubmit={submitCustomerForm} className="space-y-4">
                  <div className="rounded-2xl bg-zinc-800 border border-zinc-700 p-4 text-sm text-zinc-300">Clientes não precisam criar conta. Toda vez que abrir o link do aplicativo, preencha o formulário para identificarmos a entrega.</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <DarkInput label="Nome completo" value={customerForm.name} onChange={(value) => setCustomerForm({ ...customerForm, name: value })} placeholder="Seu nome" />
                    <DarkInput label="Telefone" value={customerForm.phone} onChange={(value) => setCustomerForm({ ...customerForm, phone: normalizePhoneInput(value) })} placeholder="(43) 98873-6791" />
                    <div><DarkInput label="CEP" value={customerForm.cep} onChange={(value) => setCustomerForm({ ...customerForm, cep: value })} placeholder="00000-000" /><button type="button" onClick={searchCustomerCep} className="text-xs text-zinc-300 underline mt-1">buscar endereço pelo CEP</button></div>
                    <DarkInput label="Número da casa" value={customerForm.number} onChange={(value) => setCustomerForm({ ...customerForm, number: value })} placeholder="Ex: 1500" />
                    <DarkInput label="Endereço / Rua" value={customerForm.street} onChange={(value) => setCustomerForm({ ...customerForm, street: value })} placeholder="Rua ou avenida" />
                    <DarkInput label="Bairro" value={customerForm.district} onChange={(value) => setCustomerForm({ ...customerForm, district: value })} placeholder="Bairro" />
                    <DarkInput label="Cidade" value={customerForm.city} onChange={(value) => setCustomerForm({ ...customerForm, city: value })} placeholder="Cidade" />
                    <DarkInput label="Estado" value={customerForm.state} onChange={(value) => setCustomerForm({ ...customerForm, state: value.toUpperCase().slice(0, 2) })} placeholder="PR" />
                    <div className="md:col-span-2"><DarkInput label="Ponto de referência" value={customerForm.reference} onChange={(value) => setCustomerForm({ ...customerForm, reference: value })} placeholder="Ex: portão preto, próximo ao mercado..." /></div>
                  </div>
                  {customerError && <p className={`text-sm ${customerError.includes("encontrado") ? "text-emerald-400" : "text-red-400"}`}>{customerError}</p>}
                  <Button type="submit" variant="secondary" className="w-full rounded-2xl py-6 text-base !bg-white !text-zinc-950 hover:!bg-zinc-200 border border-zinc-200 shadow-lg">Continuar para o pedido</Button>
                </form>
              )}

              {entryMode === "customer" && customerSubmitted && (
                <div className="space-y-4 pb-28 md:pb-8">
                  {safeCustomerCart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setShowCustomerNeedMoreMessage(false); setShowCustomerCheckout(true); }}
                      className="fixed left-3 right-3 bottom-3 z-40 rounded-3xl bg-emerald-600 px-4 py-3 pb-safe text-white shadow-2xl border border-emerald-400 text-left hover:bg-emerald-700 active:scale-[0.99] touch-manipulation"
                    >
                      <span className="block text-[11px] font-black uppercase tracking-wide opacity-90">Carrinho atualizado</span>
                      <span className="block text-lg font-black">{customerCartItemCount} item{customerCartItemCount > 1 ? "s" : ""} • {money(customerDeliveryTotal)}</span>
                      <span className="block text-xs font-semibold opacity-95">Produtos: {money(customerCartTotal)} • Entrega: {money(normalizeDeliveryFee(storeSettings.defaultDeliveryFee))} • tocar para conferir</span>
                    </button>
                  )}

                  {showCustomerPromo && activeCustomerPromotions.length > 0 && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                      <div className="relative w-full max-w-sm">
                        {canCloseCustomerPromo ? (
                          <button
                            type="button"
                            onClick={() => setShowCustomerPromo(false)}
                            className="absolute -right-2 -top-12 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-950 text-xl font-black shadow-lg border border-zinc-200"
                            aria-label="Fechar promoção"
                          >
                            ×
                          </button>
                        ) : (
                          <div className="absolute -right-2 -top-12 z-20 rounded-full bg-white/90 px-3 py-2 text-xs font-bold text-zinc-950 shadow-lg">
                            3s
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => goToPromotionProduct(activeCustomerPromotions[0])}
                          className={`relative w-full overflow-hidden rounded-[2rem] text-zinc-950 shadow-2xl border text-left ${activeCustomerPromotions[0].imageUrl ? "bg-black border-zinc-800" : "bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 border-yellow-200"}`}
                        >
                          {activeCustomerPromotions[0].imageUrl ? (
                            <div className="relative">
                              <img src={activeCustomerPromotions[0].imageUrl} alt={activeCustomerPromotions[0].title} className="w-full aspect-[4/5] object-cover" />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-5 text-white">
                                <p className="text-xs font-black uppercase tracking-[0.22em]">{activeCustomerPromotions[0].badge}</p>
                                <h2 className="mt-1 text-2xl font-black leading-none">{activeCustomerPromotions[0].title}</h2>
                                <p className="mt-2 text-sm font-semibold">Toque para ir direto ao produto</p>
                              </div>
                            </div>
                          ) : (
                            <div className="p-6 text-center">
                              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-950 text-2xl shadow-lg">
                                🍻
                              </div>
                              <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-800">{activeCustomerPromotions[0].badge}</p>
                              <h2 className="mt-2 text-3xl font-black leading-none">{activeCustomerPromotions[0].title}</h2>
                              <p className="mt-2 text-sm font-bold">{activeCustomerPromotions[0].description}</p>
                              <div className="mt-5 rounded-3xl bg-white/85 p-4 shadow-sm">
                                <p className="text-sm font-semibold text-zinc-600">Toque na promoção</p>
                                <p className="text-2xl font-black">{getPromotionProduct(products, activeCustomerPromotions[0])?.name || "Produto"}</p>
                                <p className="text-sm text-zinc-600">Ir direto para o produto</p><p className="mt-1 text-sm font-black text-emerald-700">{money(getPromotionPrice(getPromotionProduct(products, activeCustomerPromotions[0]), activeCustomerPromotions[0]))}</p>
                              </div>
                              <p className="mt-4 text-xs font-semibold text-zinc-800">O botão de fechar aparece após 3 segundos.</p>
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="rounded-3xl bg-white text-zinc-950 p-4 md:p-5 shadow-sm">
                    <h2 className="text-xl font-black mb-1">Monte seu pedido</h2>
                    <p className="text-xs text-zinc-600"><b>Entrega para:</b> {customerForm.street}, {customerForm.number} - {customerForm.district}, {customerForm.city}/{customerForm.state}</p>
                    <p className={`text-xs font-bold mt-1 ${effectiveStoreIsOpen ? "text-emerald-600" : "text-red-600"}`}>{effectiveStoreIsOpen ? "Estamos abertos" : "Estamos fechados no momento"} • {storeOpenStatus.message} • {storeOpeningHoursSummary}</p>
                    <p className="text-xs text-zinc-500 mt-1">Pedido mínimo: {money(storeSettings.minimumOrderValue)} em produtos • Entrega estimada agora: {nextOrderEstimatedDeliveryLabel}</p>
                  </div>
                  {customerNotifications.length > 0 && (
                    <div className="rounded-3xl bg-amber-50 border border-amber-200 p-4 text-amber-900">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-sm mb-1">Atualizações do pedido</p>
                          {customerNotifications.slice(0, 3).map((notification) => <p key={notification.id} className="text-xs">• {notification.message}</p>)}
                        </div>
                        <button type="button" onClick={() => markNotificationsRead("customer", "", normalizedCustomerPhoneForNotifications)} className="shrink-0 rounded-xl bg-white px-3 py-2 text-[11px] font-black text-amber-900 shadow-sm">Ok</button>
                      </div>
                    </div>
                  )}

                  {customerOrderConfirmation && !showCustomerCheckout && (
                    <div className="rounded-3xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Pedido enviado</p>
                          <h3 className="mt-1 text-2xl font-black leading-tight">#{customerOrderConfirmation.id}</h3>
                          <p className="mt-1 text-sm font-semibold">Total: {money(customerOrderConfirmation.total)} • {customerOrderConfirmation.payment}</p>
                          <p className="text-sm">Tempo estimado: {formatEstimatedDeliveryTime(customerOrderConfirmation.estimatedDeliveryMinutes || nextOrderEstimatedDeliveryMinutes)}</p>
                          <p className="mt-2 text-xs text-emerald-800">A loja recebeu seu pedido. Aguarde a aprovação e acompanhe as atualizações nesta tela.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setCustomerOrderConfirmation(null); setCustomerError(""); }}
                          className="shrink-0 rounded-xl bg-white px-3 py-2 text-[11px] font-black text-emerald-900 shadow-sm"
                        >
                          Ok
                        </button>
                      </div>
                    </div>
                  )}

                  {customerError && !showCustomerCheckout && !customerVariantPicker.open && (
                    <div className={`rounded-3xl border p-3 text-sm font-bold ${customerError.includes("adicionado") || customerError.includes("enviado") ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
                      {customerError}
                    </div>
                  )}

                  <div className="sticky top-3 z-20 rounded-3xl bg-white text-zinc-950 p-3 space-y-3 shadow-lg md:static md:shadow-none">
                    <SearchBox value={customerProductSearch} onChange={setCustomerProductSearch} placeholder="Buscar produto por nome, grupo ou código" />
                    <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                      {["Todos", ...(customerVisibleKits.length > 0 ? ["Kits"] : []), ...visibleCustomerGroups].map((group) => (
                        <button
                          key={group}
                          type="button"
                          onClick={() => setSelectedCustomerGroup(group)}
                          className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold border touch-manipulation ${selectedCustomerGroup === group ? "bg-zinc-950 text-white border-zinc-950" : "bg-zinc-50 text-zinc-700 border-zinc-200"}`}
                        >
                          {group}
                        </button>
                      ))}
                    </div>
                  </div>

                  {customerVisibleKits.length > 0 && (selectedCustomerGroup === "Todos" || selectedCustomerGroup === "Kits") && (
                    <div className="space-y-3">
                      <h3 className="text-white font-black text-sm px-1 uppercase tracking-wide">Kits</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {customerVisibleKits.map((kit) => (
                          <div key={kit.id} className="rounded-2xl bg-yellow-50 text-zinc-950 p-3 border border-yellow-200 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="font-black text-sm leading-tight truncate">{kit.name}</p>
                                <p className="text-[11px] text-zinc-600 mt-0.5">{kit.description || describeKitItems(kit, products)}</p>
                                <p className="text-[11px] text-zinc-500 mt-0.5">{describeKitItems(kit, products)}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-black">{money(kit.price)}</p>
                                <Button onClick={() => addKitToCustomerCart(kit)} className="mt-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 px-3 py-1.5 h-auto text-xs">
                                  Adicionar
                                </Button>
                                {getCustomerKitCartQuantity(kit.id) > 0 && (
                                  <p className="mt-2 rounded-xl bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">No pedido: {getCustomerKitCartQuantity(kit.id)} • {money(getCustomerKitCartSubtotal(kit.id))}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {shouldShowCustomerProducts && (
                    <div className="grid gap-3 md:max-h-[70vh] md:overflow-auto md:pr-1 pb-2">
                    {customerProductResults.length === 0 && (
                      <div className="rounded-3xl bg-white text-zinc-950 p-5 text-sm text-zinc-500">Nenhum produto encontrado nessa sessão.</div>
                    )}
                    {(selectedCustomerGroup === "Todos" ? groupedCustomerProducts : [{ group: selectedCustomerGroup, products: customerProductResults }]).map((section) => (
                      <div key={section.group} className="space-y-3">
                        <h3 className="text-white font-black text-sm px-1 uppercase tracking-wide">{section.group}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {section.products.map((product) => {
                            const productQuantityInCart = getCustomerProductCartQuantity(product.id);
                            const productSubtotalInCart = getCustomerProductCartSubtotal(product.id);
                            const hasProductInCart = productQuantityInCart > 0;
                            return (
                              <div key={product.id} className={`rounded-2xl bg-white text-zinc-950 p-3 border shadow-sm ${hasProductInCart ? "border-emerald-300 ring-1 ring-emerald-100" : "border-zinc-100"}`}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-zinc-100 bg-white">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-white" />}</div>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-black text-base leading-tight break-words">{product.name}</p>
                                      <p className="text-[11px] text-zinc-500 mt-1">{product.category} • estoque {product.stock}</p>
                                      {productHasActiveVariants(product) && <p className="text-[11px] font-bold text-purple-700 mt-1">Escolha os sabores</p>}
                                      {hasProductInCart && (
                                        <div className="mt-2 rounded-2xl bg-emerald-50 px-3 py-2 text-emerald-800">
                                          <p className="text-xs font-black">No pedido: {productQuantityInCart} unidade{productQuantityInCart > 1 ? "s" : ""}</p>
                                          <p className="text-xs font-semibold">Subtotal deste produto: {money(productSubtotalInCart)}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0 min-w-[96px]">
                                    {getProductActivePromotion(product, promotions) && <p className="text-[11px] text-zinc-400 line-through">{money(product.price)}</p>}
                                    <p className="text-base font-black text-emerald-700">{money(getProductSalePrice(product, promotions))}</p>
                                    {Number(product.stock || 0) <= 0 ? (
                                      <Button disabled className="mt-2 rounded-xl bg-zinc-400 px-3 py-3 h-auto text-xs touch-manipulation">Sem estoque</Button>
                                    ) : hasProductInCart && !productHasActiveVariants(product) ? (
                                      <div className="mt-2 inline-flex items-center rounded-2xl border border-emerald-200 bg-emerald-50 p-1 shadow-sm">
                                        <button type="button" onClick={() => decreaseCustomerProductCartQuantity(product.id)} className="h-9 w-9 rounded-xl bg-white text-lg font-black text-zinc-950 shadow-sm touch-manipulation" aria-label={`Diminuir ${product.name}`}>−</button>
                                        <span className="min-w-9 px-2 text-center text-sm font-black text-emerald-800">{productQuantityInCart}</span>
                                        <button type="button" onClick={() => addProductToCustomerCart(product)} className="h-9 w-9 rounded-xl bg-zinc-950 text-lg font-black text-white shadow-sm touch-manipulation" aria-label={`Adicionar mais ${product.name}`}>+</button>
                                      </div>
                                    ) : (
                                      <Button onClick={() => addProductToCustomerCart(product)} className="mt-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 px-3 py-3 h-auto text-xs touch-manipulation">
                                        {productHasActiveVariants(product) ? (hasProductInCart ? "Adicionar sabores" : "Escolher") : "Adicionar"}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    </div>
                  )}


                  {customerVariantPicker.open && customerVariantPicker.product && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 md:items-center md:p-4">
                      <div className="w-full max-w-lg max-h-[88vh] overflow-auto rounded-[2rem] bg-white text-zinc-950 p-5 space-y-4 shadow-2xl border border-zinc-200">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-700">Escolha os sabores</p>
                            <h3 className="mt-1 text-2xl font-black leading-tight">{customerVariantPicker.product.name}</h3>
                            <p className="mt-1 text-sm text-zinc-600">Selecione a quantidade de cada sabor.</p>
                          </div>
                          <button type="button" onClick={closeCustomerVariantPicker} className="h-9 w-9 shrink-0 rounded-full bg-zinc-100 text-xl font-black text-zinc-950">×</button>
                        </div>

                        <div className="grid gap-3">
                          {getActiveProductVariants(customerVariantPicker.product).map((variant) => (
                            <div key={variant.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-white">
                                  {(variant.imageUrl || customerVariantPicker.product.imageUrl) ? <img src={variant.imageUrl || customerVariantPicker.product.imageUrl} alt={variant.name} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-white" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-black text-sm leading-tight truncate">{variant.name}</p>
                                  <p className="text-xs text-zinc-500">{money(getProductSalePrice(customerVariantPicker.product, promotions))} cada</p>
                                </div>
                              </div>
                              <div className="inline-flex items-center rounded-2xl border border-zinc-200 bg-white p-1">
                                <button type="button" onClick={() => updateCustomerVariantQuantity(variant.id, Math.max(0, Number(customerVariantPicker.quantities?.[variant.id] || 0) - 1))} className="h-9 w-9 rounded-xl bg-zinc-100 text-lg font-black text-zinc-950">−</button>
                                <input type="text" inputMode="numeric" pattern="[0-9]*" value={customerVariantPicker.quantities?.[variant.id] || 0} onChange={(event) => updateCustomerVariantQuantity(variant.id, event.target.value.replace(/\D/g, ""))} className="h-9 w-12 bg-white text-center text-base font-black outline-none" />
                                <button type="button" onClick={() => updateCustomerVariantQuantity(variant.id, Number(customerVariantPicker.quantities?.[variant.id] || 0) + 1)} className="h-9 w-9 rounded-xl bg-zinc-950 text-lg font-black text-white">+</button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {customerError && <p className="text-sm text-red-600">{customerError}</p>}

                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <Button type="button" variant="secondary" onClick={closeCustomerVariantPicker} className="rounded-2xl py-4 !bg-zinc-100 !text-zinc-950 hover:!bg-zinc-200">Voltar</Button>
                          <Button type="button" onClick={addSelectedVariantsToCustomerCart} className="rounded-2xl py-4 bg-zinc-950 text-white hover:bg-zinc-800">Adicionar</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {showCustomerNeedMoreMessage && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                      <div className="w-full max-w-sm rounded-[2rem] bg-white p-5 text-zinc-950 shadow-2xl border border-zinc-200">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Antes de finalizar</p>
                            <h3 className="mt-1 text-2xl font-black leading-tight">Precisa de algo mais?</h3>
                            <p className="mt-2 text-sm text-zinc-600">Confira se não faltou gelo, refrigerante, salgadinho ou mais algum item.</p>
                          </div>
                          <button type="button" onClick={() => setShowCustomerNeedMoreMessage(false)} className="h-9 w-9 shrink-0 rounded-full bg-zinc-100 text-xl font-black text-zinc-950">×</button>
                        </div>
                        <div className="mt-5 grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => { setShowCustomerNeedMoreMessage(false); setShowCustomerCheckout(false); }}
                            className="rounded-2xl py-4 !bg-zinc-100 !text-zinc-950 hover:!bg-zinc-200"
                          >
                            Sim
                          </Button>
                          <Button
                            type="button"
                            onClick={() => { setShowCustomerNeedMoreMessage(false); setShowCustomerCheckout(true); }}
                            className="rounded-2xl py-4 bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            Somente isso
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {showCustomerCheckout && (
                    <div id="customer-checkout" className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 md:items-center md:p-4">
                      <div className="w-full max-w-lg max-h-[88vh] overflow-auto rounded-[2rem] bg-white text-zinc-950 p-5 space-y-3 shadow-2xl border border-zinc-200">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-bold text-lg">Finalizar pedido</h3>
                      <button type="button" onClick={() => setShowCustomerCheckout(false)} className="h-9 w-9 rounded-full bg-zinc-100 text-zinc-950 text-xl font-black">×</button>
                    </div>
                    {safeCustomerCart.length === 0 && <p className="text-sm text-zinc-500">Nenhum produto adicionado ainda.</p>}
                    {safeCustomerCart.map((item, index) => (
                      <div key={item.cartKey || `${item.id}-${index}`} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-black leading-tight text-sm break-words">{item.name}</p>
                            {item.variantName && <p className="mt-0.5 text-xs font-bold text-purple-700">Sabor: {item.variantName}</p>}
                            <p className="mt-1 text-xs text-zinc-500">{money(item.price)} cada</p>
                          </div>
                          <p className="shrink-0 text-right text-sm font-black">{money(toSafeMoneyNumber(item.price, 0) * toPositiveInteger(item.quantity, 1))}</p>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="inline-flex items-center rounded-2xl border border-zinc-200 bg-white p-1">
                            <button type="button" onClick={() => updateCustomerCartQuantity(item.cartKey || item.id, Math.max(1, toPositiveInteger(item.quantity, 1) - 1))} className="h-9 w-9 rounded-xl bg-zinc-100 text-lg font-black text-zinc-950">−</button>
                            <input type="text" inputMode="numeric" pattern="[0-9]*" value={item.quantity} onChange={(event) => updateCustomerCartQuantity(item.cartKey || item.id, event.target.value.replace(/\D/g, ""))} className="h-9 w-12 bg-white text-center text-base font-black outline-none" />
                            <button type="button" onClick={() => updateCustomerCartQuantity(item.cartKey || item.id, toPositiveInteger(item.quantity, 1) + 1)} className="h-9 w-9 rounded-xl bg-zinc-950 text-lg font-black text-white">+</button>
                          </div>
                          <button type="button" onClick={() => removeCustomerCartItem(item.cartKey || item.id)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600">Excluir</button>
                        </div>
                      </div>
                    ))}

                    <label className="block">
                      <span className="text-xs font-medium text-zinc-600">Forma de pagamento</span>
                      <select value={customerPayment} onChange={(event) => setCustomerPayment(event.target.value)} className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 outline-none">
                        <option>Pix</option>
                        <option>Dinheiro</option>
                        <option>Cartão débito</option>
                        <option>Cartão crédito</option>
                      </select>
                    </label>
                    {customerPayment === "Dinheiro" && (
                      <Input label="Precisa de troco para quanto?" type="number" value={customerChangeFor} onChange={setCustomerChangeFor} placeholder="Ex: 100,00" />
                    )}

                    {customerOrderConfirmation && (
                      <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-800">
                        <p className="text-sm font-semibold">Pedido enviado com sucesso</p>
                        <p className="text-2xl font-black">#{customerOrderConfirmation.id}</p>
                        <p className="text-sm">Total: {money(customerOrderConfirmation.total)} • {customerOrderConfirmation.payment}</p><p className="text-sm font-semibold">Tempo estimado: {formatEstimatedDeliveryTime(customerOrderConfirmation.estimatedDeliveryMinutes || nextOrderEstimatedDeliveryMinutes)}</p>
                      </div>
                    )}

                    <div className="border-t border-zinc-100 pt-3">
                      <p className="text-sm text-zinc-500">Produtos: {money(customerCartTotal)}</p>
                      <p className={`text-sm font-semibold ${isOrderAboveMinimum(customerCartTotal, storeSettings.minimumOrderValue) ? "text-emerald-600" : "text-red-600"}`}>Pedido mínimo: {money(storeSettings.minimumOrderValue)}</p>
                      <p className="text-sm text-zinc-500">Taxa de entrega: {money(normalizeDeliveryFee(storeSettings.defaultDeliveryFee))}</p>
                      <p className="text-2xl font-black">Total: {money(buildDeliveryTotal(customerCartTotal, storeSettings.defaultDeliveryFee))}</p>
                    </div>

                    {customerError && <p className={`text-sm ${customerError.includes("enviado") ? "text-emerald-600" : "text-red-600"}`}>{customerError}</p>}

                    <div className="grid grid-cols-1 gap-2">
                      <Button onClick={submitCustomerOrder} disabled={customerSubmitting || safeCustomerCart.length === 0} className="rounded-2xl bg-zinc-950 hover:bg-zinc-800 py-6 disabled:opacity-60 disabled:cursor-not-allowed">{customerSubmitting ? "Enviando pedido..." : "Enviar pedido para a loja"}</Button>
                    </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {entryMode === "loja" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <DarkLoginInput icon="mail" label="E-mail ou usuário" value={login} onChange={setLogin} placeholder="loja, gabrieladmin ou usuário cadastrado" />
                  <DarkLoginInput icon="lock" label="Senha" value={password} onChange={setPassword} placeholder="Digite sua senha" type={showPassword ? "text" : "password"} rightButton={<button type="button" onClick={() => setShowPassword(!showPassword)} className="text-zinc-400"><Icon name={showPassword ? "eyeOff" : "eye"} /></button>} />
                  {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
                  <Button type="submit" className="w-full rounded-2xl py-6 text-base !bg-white !text-zinc-950 hover:!bg-zinc-200">Entrar como loja</Button>
                  <div className="text-xs text-zinc-500 leading-relaxed">Acesso da loja validado preferencialmente pela tabela <b>store_users</b> no Supabase. O fallback legado continua ativo apenas para não travar a operação.</div>
                </form>
              )}

              {entryMode === "courier" && (
                <form onSubmit={handleCourierLogin} className="space-y-4">
                  <div className="rounded-2xl bg-zinc-800 border border-zinc-700 p-4 text-sm text-zinc-300">O acesso do entregador é criado e controlado pela loja. O entregador não cria conta própria.</div>
                  <DarkLoginInput icon="user" label="Usuário do entregador" value={courierLogin} onChange={setCourierLogin} placeholder="Ex: moto01" />
                  <DarkLoginInput icon="lock" label="Senha" value={courierPassword} onChange={setCourierPassword} placeholder="Senha gerada pela loja" type={showPassword ? "text" : "password"} rightButton={<button type="button" onClick={() => setShowPassword(!showPassword)} className="text-zinc-400"><Icon name={showPassword ? "eyeOff" : "eye"} /></button>} />
                  {courierLoginError && <p className="text-red-400 text-sm">{courierLoginError}</p>}
                  <Button type="submit" className="w-full rounded-2xl py-6 text-base !bg-white !text-zinc-950 hover:!bg-zinc-200">Entrar como entregador</Button>
                  <div className="text-xs text-zinc-500 leading-relaxed">Use o usuário e a senha cadastrados pela loja.</div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950">
      <header className="bg-zinc-950 text-white px-4 md:px-8 py-5 sticky top-0 z-20 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3"><StoreLogo size="h-14 w-14" /><div><h1 className="text-xl font-bold">Sistema da Loja</h1><p className="text-xs text-zinc-400">Painel administrativo exclusivo da loja • {getCurrentStoreDisplayName()} {storeSession?.role ? `(${storeSession.role})` : ""}</p></div></div>
          <Button onClick={handleStoreLogout} variant="secondary" className="rounded-2xl"><span className="mr-2"><Icon name="logout" /></span>Sair</Button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-3 md:p-8 pb-28 md:pb-8">
        <div className="mb-3 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 xl:hidden">
          <p className="font-black">Painel da loja otimizado para tablet/desktop</p>
          <p>Para operação de caixa e administração, use tela maior sempre que possível. Cliente e entregador continuam otimizados para celular.</p>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-4 xl:gap-6">
          <aside className="bg-white rounded-3xl p-2 shadow-sm border border-zinc-200 h-fit sticky top-[92px] z-10 overflow-x-auto whitespace-nowrap xl:whitespace-normal xl:sticky xl:top-28 -mx-1 xl:mx-0 flex xl:block gap-2">
            {tabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`shrink-0 xl:w-full flex items-center gap-2 xl:gap-3 px-4 py-3 rounded-2xl text-left transition ${activeTab === tab.id ? "bg-zinc-950 text-white" : "hover:bg-zinc-100 text-zinc-700"}`}><Icon name={tab.icon} /><span className="font-medium">{tab.label}</span></button>)}
          </aside>

          <section className="space-y-6 min-w-0">
            {ownerNotifications.length > 0 && (
              <NotificationPanel
                title={`Notificações da loja (${ownerUnreadNotifications} novas)`}
                notifications={ownerNotifications}
                onMarkRead={() => markNotificationsRead("loja")}
              />
            )}

            {lastAction && <div className="bg-white border border-zinc-200 rounded-3xl px-5 py-4 flex items-center gap-3 shadow-sm"><Icon name="check" className="text-emerald-600" /><p className="text-sm text-zinc-700">{lastAction}</p></div>}

            {activeTab === "dashboard" && <DashboardTab dayReport={dayReport} selfTests={selfTests} passedTests={passedTests} products={products} clients={clients} couriers={couriers} deliveries={deliveries} storeDeliverySummary={storeDeliverySummary} notifications={ownerNotifications} onInactivateProduct={toggleProductStatus} />}

            {activeTab === "products" && (
              <div className="space-y-6">
                <Title title="Cadastro de produtos" subtitle="Cadastre produtos, pesquise registros e edite somente quando precisar." />
                <CardBox>
                  <h3 className="font-bold text-lg mb-4">Grupos de produtos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 mb-4">
                    <Input label="Novo grupo" value={newProductGroup} onChange={setNewProductGroup} placeholder="Ex: Cervejas, Destilados, Refrigerantes..." />
                    <div className="flex items-end"><Button onClick={addProductGroup} className="rounded-2xl bg-zinc-950 hover:bg-zinc-800 w-full md:w-auto">Adicionar grupo</Button></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {productGroups.map((group) => (
                      <span key={group} className="rounded-2xl bg-zinc-100 border border-zinc-200 px-3 py-2 text-sm font-semibold">{group}</span>
                    ))}
                  </div>
                </CardBox>

                <CardBox>
                  <h3 className="font-bold text-lg mb-4">Novo produto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Input label="Nome" value={newProduct.name} onChange={(value) => setNewProduct({ ...newProduct, name: value })} />
                    <label className="block">
                      <span className="text-xs font-medium text-zinc-600">Grupo</span>
                      <select value={newProduct.category} onChange={(event) => setNewProduct({ ...newProduct, category: event.target.value })} className="mt-1 w-full min-h-[48px] rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-950/20">
                        {productGroups.map((group) => <option key={group} value={group}>{group}</option>)}
                      </select>
                    </label>
                    <Input label="Preço venda" type="number" value={newProduct.price} onChange={(value) => setNewProduct({ ...newProduct, price: value })} />
                    <Input label="Preço custo" type="number" value={newProduct.cost} onChange={(value) => setNewProduct({ ...newProduct, cost: value })} />
                    <Input label="Estoque" type="number" value={newProduct.stock} onChange={(value) => setNewProduct({ ...newProduct, stock: value })} />
                    <Input label="Estoque mínimo" type="number" value={newProduct.minStock} onChange={(value) => setNewProduct({ ...newProduct, minStock: value })} />
                    <Input label="Código de barras" value={newProduct.barcode} onChange={(value) => setNewProduct({ ...newProduct, barcode: value })} />
                    <label className="block md:col-span-2">
                      <span className="text-xs font-medium text-zinc-600">Imagem do produto</span>
                      <input type="file" accept="image/*" onChange={handleProductImageUpload} className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none" />
                      <span className="mt-1 block text-xs text-zinc-500">Opcional. {formatProductImageHelp()}</span>
                    </label>
                    <div className="md:col-span-2 rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                      <p className="text-xs font-bold text-zinc-600 mb-2">Prévia da foto</p>
                      <div className="h-24 w-24 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                        {newProduct.imageUrl ? <img src={newProduct.imageUrl} alt="Prévia do produto" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-white" />}
                      </div>
                    </div>
                    {newProduct.imageUrl && (
                      <div className="md:col-span-2 rounded-3xl border border-zinc-100 bg-zinc-50 p-3 flex items-center gap-3">
                        <img src={newProduct.imageUrl} alt="Prévia do produto" className="h-24 w-24 rounded-2xl object-cover border border-zinc-200" />
                        <Button onClick={() => setNewProduct({ ...newProduct, imageUrl: "" })} variant="secondary" className="rounded-2xl">Remover imagem</Button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-3xl border border-zinc-100 bg-zinc-50 p-4 space-y-3">
                    <label className="flex items-center gap-3 text-sm font-bold text-zinc-700">
                      <input type="checkbox" checked={newProduct.hasVariants === true} onChange={(event) => setNewProduct({ ...newProduct, hasVariants: event.target.checked, variants: event.target.checked ? normalizeProductVariants(newProduct.variants) : [] })} />
                      Este produto possui sabores/variações
                    </label>
                    {newProduct.hasVariants && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-black text-sm">Sabores do produto</p>
                            <p className="text-xs text-zinc-500">Cada sabor pode ter nome e foto própria.</p>
                          </div>
                          <Button onClick={addNewProductVariant} variant="secondary" className="rounded-2xl">Adicionar sabor</Button>
                        </div>
                        {normalizeProductVariants(newProduct.variants).length === 0 && <p className="text-sm text-zinc-500">Nenhum sabor cadastrado ainda.</p>}
                        <div className="grid gap-3">
                          {normalizeProductVariants(newProduct.variants).map((variant) => (
                            <div key={variant.id} className="rounded-2xl border border-zinc-200 bg-white p-3 grid grid-cols-1 md:grid-cols-[96px_1fr_auto] gap-3 items-center">
                              <div className="h-20 w-20 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                                {variant.imageUrl ? <img src={variant.imageUrl} alt={variant.name || "Sabor"} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">Foto</div>}
                              </div>
                              <div className="space-y-2">
                                <Input label="Nome do sabor" value={variant.name} onChange={(value) => updateNewProductVariant(variant.id, "name", value)} placeholder="Ex: Frutas vermelhas" />
                                <input type="file" accept="image/*" onChange={(event) => handleNewProductVariantImageUpload(variant.id, event)} className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none" />
                              </div>
                              <Button onClick={() => removeNewProductVariant(variant.id)} variant="secondary" className="rounded-2xl text-red-700">Remover</Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <Button onClick={addProduct} className="mt-4 rounded-2xl bg-zinc-950 hover:bg-zinc-800"><span className="mr-2"><Icon name="plus" /></span>Cadastrar produto</Button>
                </CardBox>

                <CardBox>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <h3 className="font-bold text-lg">Produtos registrados</h3>
                    <div className="w-full md:max-w-md"><SearchBox value={search} onChange={setSearch} placeholder="Pesquisar produto por nome, categoria ou código" /></div>
                  </div>

                  <div className="grid gap-3">
                    {filteredProducts.length === 0 && <p className="text-sm text-zinc-500">Nenhum produto encontrado.</p>}
                    {filteredProducts.map((product) => {
                      const isEditing = editingProductId === product.id;
                      return (
                        <div key={product.id} className="rounded-3xl border border-zinc-100 bg-zinc-50 p-4 space-y-3">
                          {!isEditing ? (
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div className="flex items-center gap-3">
                                {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="h-16 w-16 rounded-2xl object-cover border border-zinc-200" />}
                                <div>
                                  <p className="font-bold">{product.name}</p>
                                  <p className="text-sm text-zinc-600">Grupo: {product.category} • {money(product.price)} • Código: {product.barcode}</p>
                                <p className="text-sm text-zinc-500">Estoque: {product.stock}{product.stock <= product.minStock ? " ⚠️" : ""} • Mínimo: {product.minStock}</p>
                                <p className={`text-sm font-semibold ${product.active ? "text-emerald-700" : "text-red-600"}`}>Status: {product.active ? "Ativo" : "Inativo"}</p>
                                  {product.hasVariants && <p className="text-sm text-purple-700 font-semibold">Sabores: {getActiveProductVariants(product).length}</p>}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <label className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold cursor-pointer hover:bg-zinc-50">
                                  Alterar foto
                                  <input type="file" accept="image/*" onChange={(event) => handleExistingProductImageUpload(product.id, event)} className="hidden" />
                                </label>
                                {product.imageUrl && <Button onClick={() => removeExistingProductImage(product.id)} variant="secondary" className="rounded-2xl">Remover foto</Button>}
                                <div className="flex flex-wrap gap-2"><Button onClick={() => setEditingProductId(product.id)} variant="secondary" className="rounded-2xl">Editar produto</Button><Button onClick={() => deleteProduct(product.id)} variant="secondary" className="rounded-2xl text-red-700">Excluir produto</Button></div>
                                <Button onClick={() => toggleProductStatus(product.id)} variant="secondary" className="rounded-2xl">{product.active ? "Inativar" : "Ativar"}</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <Input label="Nome" value={product.name} onChange={(value) => updateProductField(product.id, "name", value)} />
                                <label className="block">
                                  <span className="text-xs font-medium text-zinc-600">Grupo</span>
                                  <select value={product.category} onChange={(event) => updateProductField(product.id, "category", event.target.value)} className="mt-1 w-full min-h-[48px] rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-950/20">
                                    {productGroups.map((group) => <option key={group} value={group}>{group}</option>)}
                                  </select>
                                </label>
                                <Input label="Preço venda" type="number" value={product.price} onChange={(value) => updateProductField(product.id, "price", value)} />
                                <Input label="Preço custo" type="number" value={product.cost} onChange={(value) => updateProductField(product.id, "cost", value)} />
                                <Input label="Estoque" type="number" value={product.stock} onChange={(value) => updateProductField(product.id, "stock", value)} />
                                <Input label="Estoque mínimo" type="number" value={product.minStock} onChange={(value) => updateProductField(product.id, "minStock", value)} />
                                <Input label="Código de barras" value={product.barcode} onChange={(value) => updateProductField(product.id, "barcode", value)} />
                                <label className="block md:col-span-2">
                                  <span className="text-xs font-medium text-zinc-600">Alterar foto do produto</span>
                                  <input type="file" accept="image/*" onChange={(event) => handleExistingProductImageUpload(product.id, event)} className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none" />
                                  <span className="mt-1 block text-xs text-zinc-500">Opcional. {formatProductImageHelp()}</span>
                                </label>
                                <div className="md:col-span-2 rounded-2xl border border-zinc-100 bg-white p-3">
                                  <p className="text-xs font-bold text-zinc-600 mb-2">Foto atual</p>
                                  <div className="flex items-center gap-3">
                                    <div className="h-24 w-24 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                                      {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">Sem foto</div>}
                                    </div>
                                    {product.imageUrl && <Button onClick={() => removeExistingProductImage(product.id)} variant="secondary" className="rounded-2xl">Remover foto</Button>}
                                  </div>
                                </div>
                              </div>
                              <div className="rounded-3xl border border-zinc-100 bg-white p-4 space-y-3">
                                <label className="flex items-center gap-3 text-sm font-bold text-zinc-700">
                                  <input type="checkbox" checked={product.hasVariants === true} onChange={(event) => updateProductField(product.id, "hasVariants", event.target.checked)} />
                                  Este produto possui sabores/variações
                                </label>
                                {product.hasVariants && (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                      <div>
                                        <p className="font-black text-sm">Sabores cadastrados</p>
                                        <p className="text-xs text-zinc-500">Clique em Salvar alterações para gravar no Supabase.</p>
                                      </div>
                                      <Button onClick={() => addExistingProductVariant(product.id)} variant="secondary" className="rounded-2xl">Adicionar sabor</Button>
                                    </div>
                                    {normalizeProductVariants(product.variants).length === 0 && <p className="text-sm text-zinc-500">Nenhum sabor cadastrado.</p>}
                                    <div className="grid gap-3">
                                      {normalizeProductVariants(product.variants).map((variant) => (
                                        <div key={variant.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 grid grid-cols-1 md:grid-cols-[96px_1fr_auto] gap-3 items-center">
                                          <div className="h-20 w-20 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                                            {variant.imageUrl ? <img src={variant.imageUrl} alt={variant.name || "Sabor"} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">Foto</div>}
                                          </div>
                                          <div className="space-y-2">
                                            <Input label="Nome do sabor" value={variant.name} onChange={(value) => updateExistingProductVariant(product.id, variant.id, "name", value)} />
                                            <input type="file" accept="image/*" onChange={(event) => handleExistingProductVariantImageUpload(product.id, variant.id, event)} className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none" />
                                          </div>
                                          <Button onClick={() => removeExistingProductVariant(product.id, variant.id)} variant="secondary" className="rounded-2xl text-red-700">Remover</Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <p className="text-sm text-zinc-500">Produto atual: {product.name} • {money(product.price)} • Estoque {product.stock}</p>
                                <div className="flex flex-wrap gap-2">
                                  <Button onClick={() => toggleProductStatus(product.id)} variant="secondary" className="rounded-2xl">{product.active ? "Inativar" : "Ativar"}</Button>
                                  <Button onClick={() => setEditingProductId(null)} variant="secondary" className="rounded-2xl">Cancelar</Button>
                                  <Button onClick={() => saveProductEdits(product.id)} className="rounded-2xl bg-zinc-950 hover:bg-zinc-800">Salvar alterações</Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardBox>
              </div>
            )}

            {activeTab === "kits" && (
              <div className="space-y-6">
                <Title title="Kits da loja" subtitle="Monte combos usando somente produtos já cadastrados. O valor base vem dos produtos, mas pode ser alterado." />

                <CardBox>
                  <h3 className="font-bold text-lg mb-4">Novo kit</h3>
                  <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-bold">Regra dos kits</p>
                    <p>O kit só pode ser montado com produtos cadastrados. Se não colocar data final, ele fica ativo até você inativar manualmente.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                    <Input label="Nome do kit" value={newKit.name} onChange={(value) => setNewKit({ ...newKit, name: value })} placeholder="Ex: Kit Balada" />
                    <Input label="Descrição" value={newKit.description} onChange={(value) => setNewKit({ ...newKit, description: value })} placeholder="Ex: 2 vodka, 2 energéticos..." />
                    <Input label="Valor do kit" type="number" value={newKit.price} onChange={(value) => { setNewKitPriceEdited(true); setNewKit({ ...newKit, price: value === "" ? "" : Number(value || 0) }); }} placeholder={String(newKitProductsTotal)} />
                    <Input label="Data para acabar" type="date" value={newKit.endDate} onChange={(value) => setNewKit({ ...newKit, endDate: value })} />
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="rounded-3xl border border-zinc-100 bg-zinc-50 p-4">
                      <h4 className="font-bold mb-3">Adicionar produtos cadastrados</h4>
                      <SearchBox value={kitProductSearch} onChange={setKitProductSearch} placeholder="Pesquisar produto por nome, grupo ou código" />
                      <div className="mt-3 grid max-h-72 gap-2 overflow-auto pr-1">
                        {filteredKitProducts.map((product) => (
                          <button key={product.id} type="button" onClick={() => addProductToNewKit(product)} className="rounded-2xl border border-zinc-200 bg-white p-3 text-left hover:bg-zinc-100">
                            <p className="text-sm font-bold">{product.name}</p>
                            <p className="text-xs text-zinc-500">{product.category} • {money(product.price)} • estoque {product.stock}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-zinc-100 bg-zinc-50 p-4">
                      <h4 className="font-bold mb-3">Produtos do kit</h4>
                      {newKit.items.length === 0 && <p className="text-sm text-zinc-500">Nenhum produto adicionado ao kit.</p>}
                      <div className="grid gap-2">
                        {newKit.items.map((item) => {
                          const product = products.find((currentProduct) => currentProduct.id === Number(item.productId));
                          return (
                            <div key={item.productId} className="rounded-2xl border border-zinc-100 bg-white p-3 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-bold text-sm truncate">{product?.name || "Produto removido"}</p>
                                <p className="text-xs text-zinc-500">{money(product?.price || 0)} unidade</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input type="number" min="1" value={item.quantity} onChange={(event) => updateNewKitItemQuantity(item.productId, event.target.value)} className="w-16 rounded-xl border border-zinc-200 px-2 py-2 text-center" />
                                <button onClick={() => removeNewKitItem(item.productId)} className="text-red-600 text-sm">remover</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 border-t border-zinc-200 pt-3">
                        <p className="text-sm text-zinc-500">Valor dos produtos: {money(newKitProductsTotal)}</p>
                        <p className="text-xl font-black">Valor do kit: {money(newKit.price === "" ? newKitProductsTotal : newKit.price)}</p>
                      </div>
                    </div>
                  </div>

                  <Button onClick={addKit} className="mt-4 rounded-2xl bg-zinc-950 hover:bg-zinc-800"><span className="mr-2"><Icon name="plus" /></span>Cadastrar kit</Button>
                </CardBox>

                <CardBox>
                  <h3 className="font-bold text-lg mb-4">Kits cadastrados</h3>
                  <div className="grid gap-3">
                    {kits.length === 0 && <p className="text-sm text-zinc-500">Nenhum kit cadastrado.</p>}
                    {kits.map((kit) => {
                      const isEditing = editingKitId === kit.id;
                      const baseTotal = buildKitProductsTotal(kit.items, products);
                      return (
                        <div key={kit.id} className="rounded-3xl border border-zinc-100 bg-zinc-50 p-4 space-y-3">
                          {!isEditing ? (
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div>
                                <p className="font-black">{kit.name}</p>
                                <p className="text-sm text-zinc-600">{kit.description || describeKitItems(kit, products)}</p>
                                <p className="text-xs text-zinc-500">Produtos: {describeKitItems(kit, products)}</p>
                                <p className="text-xs text-zinc-500">Valor dos produtos: {money(baseTotal)} • Valor do kit: {money(kit.price)} • Data final: {kit.endDate || "sem data"}</p>
                                <p className={`text-sm font-semibold ${kit.active && isKitInPeriod(kit) ? "text-emerald-700" : "text-red-600"}`}>Status: {kit.active && isKitInPeriod(kit) ? "Ativo" : "Inativo"}</p>
                                {kit.active && !isKitInPeriod(kit) && <p className="text-xs font-bold text-amber-700">Data final vencida. O kit não aparece para o cliente.</p>}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button onClick={() => setEditingKitId(kit.id)} variant="secondary" className="rounded-2xl">Editar kit</Button>
                                <Button onClick={() => toggleKitStatus(kit.id)} variant="secondary" className="rounded-2xl">{kit.active ? "Inativar" : "Ativar"}</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <Input label="Nome" value={kit.name} onChange={(value) => updateKitField(kit.id, "name", value)} />
                                <Input label="Descrição" value={kit.description} onChange={(value) => updateKitField(kit.id, "description", value)} />
                                <Input label="Valor do kit" type="number" value={kit.price} onChange={(value) => updateKitField(kit.id, "price", value)} />
                                <Input label="Data para acabar" type="date" value={kit.endDate} onChange={(value) => updateKitField(kit.id, "endDate", value)} />
                              </div>
                              <div className="rounded-3xl border border-zinc-100 bg-white p-4 space-y-3">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                  <div>
                                    <p className="font-bold">Produtos do kit</p>
                                    <p className="text-sm text-zinc-500">Valor base atual: {money(baseTotal)}</p>
                                  </div>
                                  <div className="w-full md:max-w-md"><SearchBox value={editingKitProductSearch} onChange={setEditingKitProductSearch} placeholder="Pesquisar produto para adicionar" /></div>
                                </div>
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                                  <div className="grid gap-2 max-h-52 overflow-auto pr-1">
                                    {getActiveProducts(products).filter((product) => `${product.name || ""} ${product.category || ""} ${product.barcode || ""}`.toLowerCase().includes(editingKitProductSearch.toLowerCase())).map((product) => (
                                      <button key={product.id} type="button" onClick={() => addProductToExistingKit(kit.id, product)} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-left hover:bg-zinc-100">
                                        <p className="text-sm font-bold">{product.name}</p>
                                        <p className="text-xs text-zinc-500">{money(product.price)} • estoque {product.stock}</p>
                                      </button>
                                    ))}
                                  </div>
                                  <div className="grid gap-2">
                                    {(kit.items || []).map((item) => {
                                      const product = products.find((currentProduct) => currentProduct.id === Number(item.productId));
                                      return (
                                        <div key={item.productId} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3 flex items-center justify-between gap-3">
                                          <div className="min-w-0"><p className="font-bold text-sm truncate">{product?.name || "Produto removido"}</p><p className="text-xs text-zinc-500">{money(product?.price || 0)} unidade</p></div>
                                          <div className="flex items-center gap-2"><input type="number" min="1" value={item.quantity} onChange={(event) => updateExistingKitItemQuantity(kit.id, item.productId, event.target.value)} className="w-16 rounded-xl border border-zinc-200 px-2 py-2 text-center" /><button onClick={() => removeExistingKitItem(kit.id, item.productId)} className="text-red-600 text-sm">remover</button></div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button onClick={() => toggleKitStatus(kit.id)} variant="secondary" className="rounded-2xl">{kit.active ? "Inativar" : "Ativar"}</Button>
                                <Button onClick={() => setEditingKitId(null)} variant="secondary" className="rounded-2xl">Cancelar</Button>
                                <Button onClick={() => saveKitEdits(kit.id)} className="rounded-2xl bg-zinc-950 hover:bg-zinc-800">Salvar alterações</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardBox>
              </div>
            )}
            
            {activeTab === "promos" && (
              <div className="space-y-6">
                <Title title="Promoções da loja" subtitle="Cadastre as promoções que aparecem para o cliente ao entrar no aplicativo." />

                <CardBox>
                  <h3 className="font-bold text-lg mb-4">Nova promoção</h3>
                  <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-bold">Formato recomendado da foto: 1080 x 1350 px</p>
                    <p>Use imagem vertical no formato 4:5. Se deixar início e fim vazios, a promoção fica rodando até você inativar manualmente.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Input label="Chamada da promoção" value={newPromotion.title} onChange={(value) => setNewPromotion({ ...newPromotion, title: value })} placeholder="Ex: COPÃO GELADO" />
                    <Input label="Descrição" value={newPromotion.description} onChange={(value) => setNewPromotion({ ...newPromotion, description: value })} placeholder="Ex: Maracujá e Frutas Vermelhas" />
                    <Input label="Etiqueta" value={newPromotion.badge} onChange={(value) => setNewPromotion({ ...newPromotion, badge: value })} placeholder="Promoção da loja" />
                    <div className="md:col-span-4 rounded-3xl border border-zinc-100 bg-zinc-50 p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                        <div>
                          <p className="text-sm font-bold text-zinc-800">Produto vinculado</p>
                          <p className="text-xs text-zinc-500">Pesquise e clique no produto que a promoção deve abrir para o cliente.</p>
                        </div>
                        {newPromotion.productId && (
                          <span className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                            Selecionado: {getPromotionProduct(products, newPromotion)?.name || "Produto"}
                          </span>
                        )}
                      </div>
                      <SearchBox value={promotionProductSearch} onChange={setPromotionProductSearch} placeholder="Pesquisar produto por nome, grupo ou código" />
                      <div className="mt-3 grid max-h-52 gap-2 overflow-auto pr-1">
                        {filteredPromotionProducts.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => setNewPromotion({ ...newPromotion, productId: product.id, discountPercent: newPromotion.discountPercent || "", promotionalPrice: newPromotion.discountPercent ? calculatePromotionFromPercent(product.price, newPromotion.discountPercent).toFixed(2) : newPromotion.promotionalPrice })}
                            className={`rounded-2xl border p-3 text-left transition ${Number(newPromotion.productId) === product.id ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white hover:bg-zinc-100"}`}
                          >
                            <p className="text-sm font-bold">{product.name}</p>
                            <p className={`text-xs ${Number(newPromotion.productId) === product.id ? "text-zinc-300" : "text-zinc-500"}`}>{product.category} • {money(product.price)} • Código: {product.barcode}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    {newPromotion.productId && (() => { const product = getPromotionProduct(products, newPromotion); const previewPrice = product ? (toNonNegativeNumber(newPromotion.promotionalPrice, 0) > 0 ? toNonNegativeNumber(newPromotion.promotionalPrice, 0) : calculatePromotionFromPercent(product.price, newPromotion.discountPercent)) : 0; return <div className="md:col-span-4 rounded-3xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-900">Desconto da promoção</p><div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3"><Input label="Porcentagem de desconto" type="number" value={newPromotion.discountPercent} onChange={(value) => { const product = getPromotionProduct(products, newPromotion); setNewPromotion({ ...newPromotion, discountPercent: value, promotionalPrice: product ? calculatePromotionFromPercent(product.price, value).toFixed(2) : "" }); }} placeholder="Ex: 10" /><Input label="Preço promocional" type="number" value={newPromotion.promotionalPrice} onChange={(value) => setNewPromotion({ ...newPromotion, promotionalPrice: value })} placeholder="Ex: 14,90" /><div className="rounded-2xl bg-white p-3 text-sm"><p className="text-zinc-500">Prévia</p><p><span className="line-through text-zinc-400">{money(product?.price || 0)}</span> <b className="text-emerald-700">{money(previewPrice || 0)}</b></p></div></div></div>; })()}
                    <Input label="Início da promoção" type="date" value={newPromotion.startDate} onChange={(value) => setNewPromotion({ ...newPromotion, startDate: value })} />
                    <Input label="Fim da promoção" type="date" value={newPromotion.endDate} onChange={(value) => setNewPromotion({ ...newPromotion, endDate: value })} />
                    <label className="block md:col-span-2">
                      <span className="text-xs font-medium text-zinc-600">Imagem da promoção</span>
                      <input type="file" accept="image/*" onChange={handlePromotionImageUpload} className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-950/20" />
                    </label>
                  </div>

                  {newPromotion.imageUrl && (
                    <div className="mt-4 rounded-3xl border border-zinc-100 bg-zinc-50 p-4">
                      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                        <div>
                          <p className="font-bold">Prévia da imagem</p>
                          <p className="text-sm text-zinc-500">Esta imagem será exibida no popup do cliente.</p>
                        </div>
                        <Button onClick={removePromotionImage} variant="secondary" className="rounded-2xl">Remover imagem</Button>
                      </div>
                      <img src={newPromotion.imageUrl} alt="Prévia da promoção" className="mt-4 max-h-80 w-full max-w-sm rounded-3xl object-cover border border-zinc-200" />
                    </div>
                  )}

                  <Button onClick={addPromotion} className="mt-4 rounded-2xl bg-zinc-950 hover:bg-zinc-800"><span className="mr-2"><Icon name="plus" /></span>Cadastrar promoção</Button>
                </CardBox>

                <CardBox>
                  <h3 className="font-bold text-lg mb-4">Promoções cadastradas</h3>
                  <div className="grid gap-3">
                    {promotions.length === 0 && <p className="text-sm text-zinc-500">Nenhuma promoção cadastrada.</p>}
                    {promotions.map((promotion) => {
                      const product = getPromotionProduct(products, promotion);
                      const isEditing = editingPromotionId === promotion.id;
                      return (
                        <div key={promotion.id} className="rounded-3xl border border-zinc-100 bg-zinc-50 p-4 space-y-3">
                          {!isEditing ? (
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div>
                                <p className="font-black">{promotion.title}</p>
                                <p className="text-sm text-zinc-600">{promotion.description || "Sem descrição"}</p>
                                <p className="text-xs text-zinc-500">Produto: {product ? product.name : "Produto não encontrado"} • Status: {promotion.active ? "Ativa" : "Inativa"}</p>
                                <p className="text-xs text-zinc-500">Período: {promotion.startDate || "sem início"} até {promotion.endDate || "sem fim"}</p>
                                {promotion.active && !isPromotionInPeriod(promotion) && <p className="text-xs font-bold text-amber-700">Fora do período definido, não aparece para o cliente.</p>}
                                {promotion.imageUrl && <img src={promotion.imageUrl} alt={promotion.title} className="mt-3 h-24 w-20 rounded-2xl object-cover border border-zinc-200" />}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button onClick={() => setEditingPromotionId(promotion.id)} variant="secondary" className="rounded-2xl">Editar promoção</Button>
                                <Button onClick={() => togglePromotionStatus(promotion.id)} variant="secondary" className="rounded-2xl">{promotion.active ? "Inativar" : "Ativar"}</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <Input label="Chamada" value={promotion.title} onChange={(value) => updatePromotionField(promotion.id, "title", value)} />
                                <Input label="Descrição" value={promotion.description} onChange={(value) => updatePromotionField(promotion.id, "description", value)} />
                                <Input label="Etiqueta" value={promotion.badge} onChange={(value) => updatePromotionField(promotion.id, "badge", value)} />
                                <div className="md:col-span-4 rounded-3xl border border-zinc-100 bg-zinc-50 p-4">
                                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                                    <div>
                                      <p className="text-sm font-bold text-zinc-800">Produto vinculado</p>
                                      <p className="text-xs text-zinc-500">Pesquise e clique para trocar o produto desta promoção.</p>
                                    </div>
                                    <span className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                                      Atual: {getPromotionProduct(products, promotion)?.name || "Produto não encontrado"}
                                    </span>
                                  </div>
                                  <SearchBox value={editingPromotionProductSearch} onChange={setEditingPromotionProductSearch} placeholder="Pesquisar produto por nome, grupo ou código" />
                                  <div className="mt-3 grid max-h-52 gap-2 overflow-auto pr-1">
                                    {filteredEditingPromotionProducts.map((item) => (
                                      <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => updatePromotionField(promotion.id, "productId", item.id)}
                                        className={`rounded-2xl border p-3 text-left transition ${Number(promotion.productId) === item.id ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white hover:bg-zinc-100"}`}
                                      >
                                        <p className="text-sm font-bold">{item.name}</p>
                                        <p className={`text-xs ${Number(promotion.productId) === item.id ? "text-zinc-300" : "text-zinc-500"}`}>{item.category} • {money(item.price)} • Código: {item.barcode}</p>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <Input label="Início" type="date" value={promotion.startDate} onChange={(value) => updatePromotionField(promotion.id, "startDate", value)} />
                                <Input label="Fim" type="date" value={promotion.endDate} onChange={(value) => updatePromotionField(promotion.id, "endDate", value)} />
                                {promotion.productId && (() => { const product = getPromotionProduct(products, promotion); const previewPrice = product ? getPromotionPrice(product, promotion) : 0; return <div className="md:col-span-4 rounded-3xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-900">Desconto da promoção</p><div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3"><Input label="Porcentagem de desconto" type="number" value={promotion.discountPercent || ""} onChange={(value) => { const product = getPromotionProduct(products, promotion); updatePromotionField(promotion.id, "discountPercent", value); if (product) updatePromotionField(promotion.id, "promotionalPrice", calculatePromotionFromPercent(product.price, value).toFixed(2)); }} placeholder="Ex: 10" /><Input label="Preço promocional" type="number" value={promotion.promotionalPrice || ""} onChange={(value) => updatePromotionField(promotion.id, "promotionalPrice", value)} placeholder="Ex: 14,90" /><div className="rounded-2xl bg-white p-3 text-sm"><p className="text-zinc-500">Prévia</p><p><span className="line-through text-zinc-400">{money(product?.price || 0)}</span> <b className="text-emerald-700">{money(previewPrice || 0)}</b></p></div></div></div>; })()}
                                <label className="block md:col-span-2">
                                  <span className="text-xs font-medium text-zinc-600">Trocar imagem</span>
                                  <input type="file" accept="image/*" onChange={(event) => handleExistingPromotionImageUpload(promotion.id, event)} className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-950/20" />
                                </label>
                              </div>

                              {promotion.imageUrl && (
                                <div className="flex flex-col md:flex-row md:items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-3">
                                  <img src={promotion.imageUrl} alt={promotion.title} className="h-24 w-20 rounded-2xl object-cover border border-zinc-200" />
                                  <Button onClick={() => updatePromotionField(promotion.id, "imageUrl", "")} variant="secondary" className="rounded-2xl">Remover imagem</Button>
                                </div>
                              )}

                              <div className="flex flex-wrap justify-end gap-2">
                                <Button onClick={() => togglePromotionStatus(promotion.id)} variant="secondary" className="rounded-2xl">{promotion.active ? "Inativar" : "Ativar"}</Button>
                                <Button onClick={() => setEditingPromotionId(null)} variant="secondary" className="rounded-2xl">Cancelar</Button>
                                <Button onClick={() => savePromotionEdits(promotion.id)} className="rounded-2xl bg-zinc-950 hover:bg-zinc-800">Salvar alterações</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardBox>
              </div>
            )}

            {activeTab === "deliveries" && (
              <div className="space-y-6">
                <Title title="Frente de caixa para entregas" subtitle="Pesquise produtos, monte o pedido, lance a entrega e imprima." />
                <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
                  <CardBox>
                    <h3 className="font-bold text-lg mb-4">1. Pesquisar produtos e kits</h3>
                    <SearchBox value={deliveryProductSearch} onChange={setDeliveryProductSearch} placeholder="Buscar produto por nome, categoria ou código de barras" />
                    <div className="mt-4 grid gap-3 max-h-96 overflow-auto pr-1">
                      {deliveryProductResults.map((product) => <div key={product.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-3"><div><p className="font-bold">{product.name}</p><p className="text-xs text-zinc-500">{product.category} • Código: {product.barcode}</p><p className="text-sm font-semibold mt-1">{money(product.price)}</p></div><Button onClick={() => addProductToDelivery(product)} className="rounded-2xl bg-zinc-950 hover:bg-zinc-800"><span className="mr-2"><Icon name="plus" /></span>Adicionar</Button></div>)}
                    </div>
                  <div className="mt-5 border-t border-zinc-100 pt-4">
                      <h4 className="font-bold mb-3">Kits disponíveis</h4>
                      <SearchBox value={pvdKitSearch} onChange={setPvdKitSearch} placeholder="Buscar kit" />
                      <div className="mt-3 grid gap-2 max-h-64 overflow-auto pr-1">
                        {pvdKitResults.map((kit) => (
                          <div key={kit.id} className="rounded-2xl border border-yellow-200 bg-yellow-50 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div><p className="font-bold">{kit.name}</p><p className="text-xs text-zinc-600">{describeKitItems(kit, products)}</p><p className="text-sm font-semibold mt-1">{money(kit.price)}</p></div>
                            <Button onClick={() => addKitToDelivery(kit)} className="rounded-2xl bg-zinc-950 hover:bg-zinc-800"><span className="mr-2"><Icon name="plus" /></span>Adicionar kit</Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardBox>
                  <CardBox>
                    <h3 className="font-bold text-lg mb-4">2. Montar entrega</h3>
                    <label className="block mb-3"><span className="text-xs font-medium text-zinc-600">Cliente</span><select value={deliveryDraft.clientId} onChange={(event) => setDeliveryDraft({ ...deliveryDraft, clientId: event.target.value })} className="mt-1 w-full min-h-[48px] rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-950/20"><option value="">Selecione um cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name} - {formatBrazilMobilePhone(client.phone)}</option>)}</select></label>
                    {selectedDeliveryClient && <div className="mb-4 rounded-2xl bg-zinc-50 border border-zinc-100 p-3 text-sm"><p><b>Telefone:</b> {formatBrazilMobilePhone(selectedDeliveryClient.phone)}</p><p><b>Endereço:</b> {buildDeliveryAddress(selectedDeliveryClient)}</p><p><b>Referência:</b> {selectedDeliveryClient.reference || "-"}</p></div>}
                    <label className="block mb-4"><span className="text-xs font-medium text-zinc-600">Pagamento</span><select value={deliveryDraft.payment} onChange={(event) => setDeliveryDraft({ ...deliveryDraft, payment: event.target.value })} className="mt-1 w-full min-h-[48px] rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-950/20"><option>Pix</option><option>Dinheiro</option><option>Cartão débito</option><option>Cartão crédito</option></select></label>
                    {deliveryDraft.payment === "Dinheiro" && <div className="mb-4"><Input label="Precisa de troco para quanto?" type="number" value={deliveryDraft.changeFor} onChange={(value) => setDeliveryDraft({ ...deliveryDraft, changeFor: value })} placeholder="Ex: 100,00" /></div>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <Input label="Desconto no pedido" type="number" value={deliveryDraft.discount} onChange={(value) => setDeliveryDraft({ ...deliveryDraft, discount: Math.max(0, Number(value || 0)) })} placeholder="0,00" />
                      <Input label="Taxa de entrega" type="number" value={deliveryDraft.deliveryFee} onChange={(value) => setDeliveryDraft({ ...deliveryDraft, deliveryFee: value === "" ? "" : Math.max(0, Number(value || 0)) })} placeholder="5,00" />
                    </div>
                    <div className="mb-4 rounded-2xl bg-zinc-50 border border-zinc-100 p-3 text-sm text-zinc-600">Entregas lançadas pelo PDV são liberadas para todos os motoboys. Pedidos feitos pelo cliente precisam ser aprovados aqui antes de aparecer para eles.<br /><b>Tempo estimado para a próxima entrega:</b> {nextOrderEstimatedDeliveryLabel}</div>
                    <Input label="Observação do pedido" value={deliveryDraft.notes} onChange={(value) => setDeliveryDraft({ ...deliveryDraft, notes: value })} placeholder="Ex: levar maquininha, troco para 100..." />
                    <div className="mt-4 space-y-2"><h4 className="font-bold">Itens do pedido</h4>{deliveryDraft.items.length === 0 && <p className="text-sm text-zinc-500">Nenhum produto selecionado ainda.</p>}{deliveryDraft.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 p-3"><div className="min-w-0"><p className="font-semibold truncate">{item.name}</p><p className="text-xs text-zinc-500">{money(item.price)} unidade</p></div><div className="flex items-center gap-2"><input type="number" min="1" value={item.quantity} onChange={(event) => updateDeliveryItemQuantity(item.id, event.target.value)} className="w-16 rounded-xl border border-zinc-200 px-2 py-2 text-center" /><span className="font-bold w-20 text-right">{money(item.price * item.quantity)}</span><button onClick={() => removeDeliveryItem(item.id)} className="rounded-xl bg-red-50 px-2 py-2 text-red-600">remover</button></div></div>)}</div>
                    <div className="mt-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-t border-zinc-100 pt-4"><div><p className="text-sm text-zinc-500">Produtos</p><p className="text-2xl font-black">{money(deliveryDraftTotal)}</p><p className="text-sm text-zinc-500">Desconto: -{money(deliveryDraftDiscount)}</p><p className="text-sm text-zinc-500">Subtotal com desconto: {money(buildDiscountedProductsTotal(deliveryDraftTotal, deliveryDraftDiscount))}</p><p className="text-sm text-zinc-500 mt-1">Taxa de entrega: {money(deliveryDraftFee)}</p><p className="text-sm text-zinc-500">Divisão final: moto própria = 100% entregador; moto do estabelecimento = valor do entregador + parte da loja.</p><p className="text-3xl font-black mt-2">Total: {money(deliveryDraftFinalTotal)}</p></div><Button onClick={launchDeliveryOrder} className="rounded-2xl bg-zinc-950 hover:bg-zinc-800 py-6 px-6">Lançar entrega e imprimir</Button></div>
                  </CardBox>
                </div>
                <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4 text-amber-900">
                  <p className="text-xs font-black uppercase tracking-wide">Demanda de entrega</p>
                  <p className="text-2xl font-black">{currentEstimatedDeliveryLabel}</p>
                  <p className="text-sm">{activeDeliveryOrdersForStore.length} entrega(s) ativa(s). Próximo pedido: {nextOrderEstimatedDeliveryLabel}. Base: 7 minutos por entrega.</p>
                </div>
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                  <Title title="Entregas lançadas" subtitle="Mostra somente entregas em aberto. Pedidos de clientes entram aqui automaticamente." />
                  <Button onClick={loadDeliveries} variant="secondary" className="rounded-2xl">Atualizar entregas</Button>
                </div>
                {activeDeliveryOrdersForStore.length === 0 && <CardBox><p className="text-sm text-zinc-500">Nenhuma entrega em aberto no momento.</p></CardBox>}
                <div className="grid gap-4">{activeDeliveryOrdersForStore.map((delivery) => <OwnerDeliveryCard key={delivery.id} delivery={delivery} isPaymentProcessing={processingPaymentIds.includes(String(delivery.id))} onPrint={printDeliveryReceipt} onApprove={approveDelivery} onManualConfirm={confirmManualDelivery} onCancel={requestCancelDelivery} onPaymentStatusChange={updatePaymentStatus} onOpenWhatsApp={handleOpenCustomerWhatsApp} onCopyWhatsApp={handleCopyCustomerWhatsAppMessage} onMarkWhatsAppSent={handleMarkCustomerWhatsAppSent} />)}</div>

                <Title title="Relatório de entregas aprovadas" subtitle="Entregas que já foram confirmadas pela loja e liberadas para o entregador." />
                <CardBox>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                    <Metric title="Aprovadas" value={approvedDeliveryReportForStore.count} icon="check" />
                    <Metric title="Total vendido" value={money(approvedDeliveryReportForStore.total)} icon="money" />
                    <Metric title="Motoboys" value={money(approvedDeliveryReportForStore.courierAmount)} icon="truck" />
                    <Metric title="Loja" value={money(approvedDeliveryReportForStore.storeAmount)} icon="chart" />
                  </div>
                  {approvedDeliveryOrdersForStore.length === 0 ? (
                    <p className="text-sm text-zinc-500">Nenhuma entrega aprovada ainda.</p>
                  ) : (
                    <div className="grid gap-2">
                      {approvedDeliveryOrdersForStore.slice().reverse().slice(0, 12).map((delivery) => (
                        <div key={delivery.id} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <span><b>Pedido #{delivery.id}</b> • {delivery.client} • {delivery.deliveredByName || delivery.pickedUpByName || "entregador"}</span>
                          <span className="font-bold">{money(delivery.value)} • aprovado {delivery.ownerApprovedAt ? new Date(delivery.ownerApprovedAt).toLocaleString("pt-BR") : "pela loja"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBox>

                <Title title="Relatório de entregas canceladas" subtitle="Controle simples para conferir cancelamentos, motivos e evitar confusão no caixa." />
                <CardBox>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <Metric title="Canceladas" value={cancelledDeliveryReportForStore.count} icon="alert" />
                    <Metric title="Valor cancelado" value={money(cancelledDeliveryReportForStore.total)} icon="money" />
                    <Metric title="Últimas 24 meses" value={cancelledDeliveryOrdersForStore.length} icon="calendar" />
                  </div>
                  {cancelledDeliveryOrdersForStore.length === 0 ? (
                    <p className="text-sm text-zinc-500">Nenhuma entrega cancelada registrada.</p>
                  ) : (
                    <div className="grid gap-2 max-h-80 overflow-auto pr-1">
                      {cancelledDeliveryOrdersForStore.slice().sort((a, b) => getOrderDateMs(b) - getOrderDateMs(a)).slice(0, 30).map((delivery) => (
                        <div key={delivery.id} className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-900 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <span><b>Pedido #{delivery.id}</b> • {delivery.client} • {delivery.cancellationReason || "Sem motivo informado"}</span>
                          <span className="font-bold">{money(delivery.value)} • {delivery.cancelledAt ? new Date(delivery.cancelledAt).toLocaleString("pt-BR") : "cancelado"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBox>
              </div>
            )}

            {activeTab === "counter" && (
              <div className="space-y-6">
                <Title title="PDV Balcão" subtitle="Venda presencial separada do PDV Entregas, mas ligada ao estoque, caixa, pagamento e relatórios." />
                <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
                  <CardBox>
                    <h3 className="font-bold text-lg mb-4">1. Pesquisar produtos e kits</h3>
                    <SearchBox value={counterProductSearch} onChange={setCounterProductSearch} placeholder="Buscar produto por nome, grupo ou código" />
                    <div className="mt-4 grid gap-3 max-h-80 overflow-auto pr-1">
                      {counterProductResults.map((product) => (
                        <div key={product.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                          <div><p className="font-bold">{product.name}</p><p className="text-xs text-zinc-500">{product.category} • Código: {product.barcode} • estoque {product.stock}</p><p className="text-sm font-semibold mt-1">{money(product.price)}</p></div>
                          <Button onClick={() => addProductToCounter(product)} className="rounded-2xl bg-zinc-950 hover:bg-zinc-800"><span className="mr-2"><Icon name="plus" /></span>Adicionar</Button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 border-t border-zinc-100 pt-4">
                      <h4 className="font-bold mb-3">Kits disponíveis</h4>
                      <SearchBox value={counterKitSearch} onChange={setCounterKitSearch} placeholder="Buscar kit" />
                      <div className="mt-3 grid gap-2 max-h-56 overflow-auto pr-1">
                        {counterKitResults.map((kit) => (
                          <div key={kit.id} className="rounded-2xl border border-yellow-200 bg-yellow-50 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div><p className="font-bold">{kit.name}</p><p className="text-xs text-zinc-600">{describeKitItems(kit, products)}</p><p className="text-sm font-semibold mt-1">{money(kit.price)}</p></div>
                            <Button onClick={() => addKitToCounter(kit)} className="rounded-2xl bg-zinc-950 hover:bg-zinc-800"><span className="mr-2"><Icon name="plus" /></span>Adicionar kit</Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardBox>

                  <CardBox>
                    <h3 className="font-bold text-lg mb-4">2. Finalizar venda balcão</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <Input label="Cliente" value={counterDraft.customerName} onChange={(value) => setCounterDraft({ ...counterDraft, customerName: value })} placeholder="Cliente balcão" />
                      <Input label="Telefone opcional" value={counterDraft.phone} onChange={(value) => setCounterDraft({ ...counterDraft, phone: normalizePhoneInput(value) })} placeholder="(43) 98873-6791" />
                    </div>
                    <label className="block mb-4"><span className="text-xs font-medium text-zinc-600">Pagamento</span><select value={counterDraft.payment} onChange={(event) => setCounterDraft({ ...counterDraft, payment: event.target.value })} className="mt-1 w-full min-h-[48px] rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-950/20"><option>Pix</option><option>Dinheiro</option><option>Cartão débito</option><option>Cartão crédito</option></select></label>
                    {counterDraft.payment === "Dinheiro" && <div className="mb-4 space-y-2"><Input label="Valor recebido / troco para quanto?" type="number" value={counterDraft.changeFor} onChange={(value) => setCounterDraft({ ...counterDraft, changeFor: value })} placeholder="Ex: 100,00" />{counterDraft.changeFor && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-800"><p className="text-xs font-bold">Troco para devolver ao cliente</p><p className="text-3xl font-black">{money(calculateChangeDue(counterDraft.changeFor, counterDraftFinalTotal))}</p></div>}</div>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <Input label="Desconto" type="number" value={counterDraft.discount} onChange={(value) => setCounterDraft({ ...counterDraft, discount: Math.max(0, Number(value || 0)) })} placeholder="0,00" />
                      <Input label="Observação" value={counterDraft.notes} onChange={(value) => setCounterDraft({ ...counterDraft, notes: value })} placeholder="Ex: retirada no balcão" />
                    </div>

                    <div className="mt-4 space-y-2"><h4 className="font-bold">Itens da venda</h4>{counterDraft.items.length === 0 && <p className="text-sm text-zinc-500">Nenhum produto selecionado ainda.</p>}{counterDraft.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 p-3"><div className="min-w-0"><p className="font-semibold truncate">{item.name}</p><p className="text-xs text-zinc-500">{money(item.price)} unidade</p></div><div className="flex items-center gap-2"><input type="number" min="1" value={item.quantity} onChange={(event) => updateCounterItemQuantity(item.id, event.target.value)} className="w-16 rounded-xl border border-zinc-200 px-2 py-2 text-center" /><span className="font-bold w-20 text-right">{money(item.price * item.quantity)}</span><button onClick={() => removeCounterItem(item.id)} className="rounded-xl bg-red-50 px-2 py-2 text-red-600">remover</button></div></div>)}</div>

                    <div className="mt-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-t border-zinc-100 pt-4"><div><p className="text-sm text-zinc-500">Produtos</p><p className="text-2xl font-black">{money(counterDraftTotal)}</p><p className="text-sm text-zinc-500">Desconto: -{money(counterDraftDiscount)}</p><p className="text-sm text-zinc-500">Taxa de entrega: {money(0)}</p><p className="text-3xl font-black mt-2">Total balcão: {money(counterDraftFinalTotal)}</p></div><Button onClick={launchCounterSale} className="rounded-2xl bg-zinc-950 hover:bg-zinc-800 py-6 px-6">Finalizar venda e imprimir</Button></div>
                  </CardBox>
                </div>

                <Title title="Vendas de balcão" subtitle="Separado das entregas, mas somado ao fechamento de caixa." />
                <div className="grid gap-4">{deliveries.filter((delivery) => isCounterOrder(delivery)).map((sale) => <OwnerDeliveryCard key={sale.id} delivery={sale} isPaymentProcessing={processingPaymentIds.includes(String(sale.id))} onPrint={printDeliveryReceipt} onApprove={approveDelivery} onManualConfirm={confirmManualDelivery} onCancel={requestCancelDelivery} onPaymentStatusChange={updatePaymentStatus} onOpenWhatsApp={handleOpenCustomerWhatsApp} onCopyWhatsApp={handleCopyCustomerWhatsAppMessage} onMarkWhatsAppSent={handleMarkCustomerWhatsAppSent} />)}</div>
              </div>
            )}

            {activeTab === "cash" && (
              <div className="space-y-6">
                <Title title="Fechamento de caixa" subtitle="Controle o fundo inicial, sangrias, dinheiro recebido e imprima o comprovante do fechamento." />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Metric title="Status" value={cashSession.isOpen ? "Aberto" : "Fechado"} icon="money" />
                  <Metric title="Fundo inicial" value={money(cashClosingReport.openingAmount)} icon="money" />
                  <Metric title="Dinheiro do dia" value={money(cashClosingReport.expectedCash)} icon="money" />
                  <Metric title="Esperado gaveta" value={money(cashClosingReport.expectedDrawerCash)} icon="check" />
                  <Metric title="Pix" value={money(cashClosingReport.byPayment?.Pix || 0)} icon="money" />
                  <Metric title="Débito" value={money(cashClosingReport.byPayment?.["Cartão débito"] || 0)} icon="money" />
                  <Metric title="Crédito" value={money(cashClosingReport.byPayment?.["Cartão crédito"] || 0)} icon="money" />
                  <Metric title="Sangrias" value={money(cashClosingReport.sangriaTotal)} icon="alert" />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <CardBox>
                    <h3 className="font-bold text-lg mb-4">1. Abrir caixa</h3>
                    <Input label="Dinheiro que já estava no caixa" type="number" value={openingCashInput} onChange={setOpeningCashInput} placeholder="Ex: 150,00" />
                    <Button onClick={openCashRegister} disabled={cashSession.isOpen} className="mt-4 rounded-2xl bg-zinc-950 text-white hover:bg-zinc-800">Abrir caixa</Button>
                    {cashSession.openedAt && <p className="mt-3 text-xs text-zinc-500">Aberto em {new Date(cashSession.openedAt).toLocaleString("pt-BR")}</p>}
                  </CardBox>

                  <CardBox>
                    <h3 className="font-bold text-lg mb-4">2. Sangria</h3>
                    <div className="grid gap-3">
                      <Input label="Valor da sangria" type="number" value={sangriaDraft.value} onChange={(value) => setSangriaDraft({ ...sangriaDraft, value })} placeholder="Ex: 100,00" />
                      <Input label="Motivo" value={sangriaDraft.reason} onChange={(value) => setSangriaDraft({ ...sangriaDraft, reason: value })} placeholder="Ex: Retirada para pagamento" />
                    </div>
                    <Button onClick={addSangria} disabled={!cashSession.isOpen} className="mt-4 rounded-2xl bg-zinc-950 text-white hover:bg-zinc-800">Adicionar sangria</Button>
                    <div className="mt-4 max-h-40 overflow-auto space-y-2">
                      {(cashSession.sangrias || []).length === 0 && <p className="text-sm text-zinc-500">Nenhuma sangria registrada.</p>}
                      {(cashSession.sangrias || []).map((item) => <div key={item.id} className="rounded-2xl border border-zinc-100 p-3 text-sm"><b>{money(item.value)}</b> • {item.reason}<br/><span className="text-xs text-zinc-500">{new Date(item.createdAt).toLocaleString("pt-BR")}</span></div>)}
                    </div>
                  </CardBox>

                  <CardBox>
                    <h3 className="font-bold text-lg mb-4">3. Fechar caixa</h3>
                    <Input label="Dinheiro contado na gaveta" type="number" value={closingCashCounted} onChange={setClosingCashCounted} placeholder="Conte a gaveta e informe aqui" />
                    <div className="mt-4 rounded-2xl bg-zinc-50 border border-zinc-100 p-3 text-sm space-y-1">
                      <p><b>Esperado:</b> {money(cashClosingReport.expectedDrawerCash)}</p>
                      <p><b>Contado:</b> {money(Number(closingCashCounted || 0))}</p>
                      <p><b>Diferença:</b> {money(Number(closingCashCounted || 0) - cashClosingReport.expectedDrawerCash)}</p>
                    </div>
                    <Button onClick={closeCashRegister} disabled={!cashSession.isOpen} className="mt-4 rounded-2xl bg-emerald-700 text-white hover:bg-emerald-800">Fechar caixa e imprimir</Button>
                  </CardBox>
                </div>

                <CardBox>
                  <h3 className="font-bold text-lg mb-4">Resumo do dia para o comprovante</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Metric title="Total vendido" value={money(cashClosingReport.totalSold)} icon="money" />
                    <Metric title="Total recebido" value={money(cashClosingReport.totalReceived)} icon="check" />
                    <Metric title="Pendente/fiado" value={money(cashClosingReport.pendingAmount)} icon="alert" />
                    <Metric title="Cancelados" value={cashClosingReport.cancelledOrders} icon="alert" />
                  </div>
                </CardBox>

                <CardBox>
                  <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-bold text-lg">Relatório de vendas por período</h3>
                      <p className="text-sm text-zinc-500">Busca por data com Pix, débito, crédito, dinheiro, pendências e cancelamentos.</p>
                    </div>
                    <div className="grid gap-2 w-full md:w-auto">
                      <div className="grid grid-cols-2 gap-2">
                        <Input label="Data inicial" type="date" value={reportRange.startDate} onChange={(value) => setReportRange({ ...reportRange, startDate: value })} />
                        <Input label="Data final" type="date" value={reportRange.endDate} onChange={(value) => setReportRange({ ...reportRange, endDate: value })} />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Button onClick={() => setReportQuickRange("today")} variant="secondary" className="rounded-xl px-3 py-2 text-xs">Hoje</Button>
                        <Button onClick={() => setReportQuickRange("last7")} variant="secondary" className="rounded-xl px-3 py-2 text-xs">7 dias</Button>
                        <Button onClick={() => setReportQuickRange("month")} variant="secondary" className="rounded-xl px-3 py-2 text-xs">Mês</Button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Metric title="Pedidos válidos" value={periodSalesReport.totalOrders || 0} icon="box" />
                    <Metric title="Ticket médio" value={money(periodSalesReport.averageTicket || 0)} icon="money" />
                    <Metric title="Total vendido" value={money(periodSalesReport.totalSold)} icon="money" />
                    <Metric title="Total recebido" value={money(periodSalesReport.totalPaid)} icon="check" />
                    <Metric title="Pix" value={money(periodSalesReport.byPayment?.Pix || 0)} icon="money" />
                    <Metric title="Dinheiro" value={money(periodSalesReport.byPayment?.Dinheiro || 0)} icon="money" />
                    <Metric title="Débito" value={money(periodSalesReport.byPayment?.["Cartão débito"] || 0)} icon="money" />
                    <Metric title="Crédito" value={money(periodSalesReport.byPayment?.["Cartão crédito"] || 0)} icon="money" />
                    <Metric title="Pendente/fiado" value={money(periodSalesReport.pendingAmount)} icon="alert" />
                    <Metric title="Cancelados" value={periodSalesReport.cancelledOrders.length} icon="alert" />
                  </div>
                </CardBox>

                <CardBox>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-bold text-lg">Produtos mais vendidos</h3>
                      <p className="text-sm text-zinc-500">Ranking por quantidade e valor vendido no período pesquisado.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
                      <Button onClick={printPeriodSalesReport} className="rounded-2xl">Imprimir vendas</Button>
                      <Button onClick={printProductSalesReport} variant="secondary" className="rounded-2xl">Imprimir produtos</Button>
                      <Button onClick={exportPeriodSalesCsv} variant="secondary" className="rounded-2xl">CSV vendas</Button>
                      <Button onClick={exportProductSalesCsv} variant="secondary" className="rounded-2xl">CSV produtos</Button>
                      <Button onClick={exportCategorySalesCsv} variant="secondary" className="rounded-2xl">CSV categorias</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="rounded-3xl border border-zinc-100 overflow-hidden">
                      <div className="grid grid-cols-[1fr_80px_110px] bg-zinc-50 px-4 py-3 text-xs font-bold text-zinc-600 uppercase">
                        <span>Produto</span><span>Qtd</span><span className="text-right">Total</span>
                      </div>
                      <div className="max-h-80 overflow-auto divide-y divide-zinc-100">
                        {productSalesReport.length === 0 ? <p className="p-4 text-sm text-zinc-500">Nenhum produto vendido no período.</p> : productSalesReport.slice(0, 25).map((row) => (
                          <div key={row.key} className="grid grid-cols-[1fr_80px_110px] px-4 py-3 text-sm items-center">
                            <span className="font-medium truncate">{row.name}</span>
                            <span>{row.quantity}</span>
                            <span className="text-right font-bold">{money(row.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-3xl border border-zinc-100 overflow-hidden">
                      <div className="grid grid-cols-[1fr_80px_110px] bg-zinc-50 px-4 py-3 text-xs font-bold text-zinc-600 uppercase">
                        <span>Categoria</span><span>Itens</span><span className="text-right">Total</span>
                      </div>
                      <div className="max-h-80 overflow-auto divide-y divide-zinc-100">
                        {categorySalesReport.length === 0 ? <p className="p-4 text-sm text-zinc-500">Nenhuma categoria vendida no período.</p> : categorySalesReport.slice(0, 25).map((row) => (
                          <div key={row.category} className="grid grid-cols-[1fr_80px_110px] px-4 py-3 text-sm items-center">
                            <span className="font-medium truncate">{row.category}</span>
                            <span>{row.quantity}</span>
                            <span className="text-right font-bold">{money(row.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardBox>

                <CardBox>
                  <h3 className="font-bold text-lg mb-4">Caixas fechados salvos</h3>
                  <p className="text-sm text-zinc-500 mb-4">O sistema usa o Supabase como base principal. O fechamento é salvo em cash_sessions e os pagamentos em order_payments.</p>
                  {cashClosings.length === 0 ? (
                    <p className="text-sm text-zinc-500">Nenhum fechamento salvo ainda.</p>
                  ) : (
                    <div className="grid gap-2 max-h-80 overflow-auto pr-1">
                      {cashClosings.slice(0, 60).map((closing) => (
                        <div key={closing.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3 text-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <span><b>{closing.closedAt ? new Date(closing.closedAt).toLocaleString("pt-BR") : "Fechamento"}</b> • vendido {money(closing.totalSold)} • recebido {money(closing.totalReceived)} • diferença {money(closing.difference || 0)}</span>
                          <div className="flex flex-col md:flex-row md:items-center gap-2">
                            <span className="font-bold">Pix {money(closing.byPayment?.Pix || 0)} • Déb {money(closing.byPayment?.["Cartão débito"] || 0)} • Créd {money(closing.byPayment?.["Cartão crédito"] || 0)} • Din {money(closing.byPayment?.Dinheiro || 0)}</span>
                            <Button onClick={() => printCashClosingFromRecord(closing)} variant="secondary" className="rounded-xl px-3 py-2 text-xs">Reimprimir</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBox>
              </div>
            )}

            {activeTab === "tabs" && (
              <div className="space-y-6">
                <Title title="Fiados e comandas" subtitle="Abra comandas, adicione produtos e feche com impressão em 2 vias." />
                <div className="grid grid-cols-1 xl:grid-cols-[0.8fr_1fr_1.2fr] gap-6">
                  <CardBox>
                    <h3 className="font-bold text-lg mb-4">Nova comanda</h3>
                    <div className="grid gap-3">
                      <Input label="Nome do cliente" value={tabDraft.customerName} onChange={(value) => setTabDraft({ ...tabDraft, customerName: value })} placeholder="Ex: João" />
                      <Input label="Telefone opcional" value={tabDraft.phone} onChange={(value) => setTabDraft({ ...tabDraft, phone: normalizePhoneInput(value) })} placeholder="(43) 98873-6791" />
                      <Input label="Limite inicial da comanda" type="number" value={tabDraft.creditLimit} onChange={(value) => setTabDraft({ ...tabDraft, creditLimit: value })} placeholder="50" />
                      <p className="rounded-2xl bg-zinc-50 p-3 text-xs text-zinc-600">Limite padrão: {money(DEFAULT_TAB_CREDIT_LIMIT)}. Após pagamentos rápidos, o limite sobe automaticamente; se atrasar ou fechar como fiado, o limite pode diminuir. Você também pode alterar manualmente em cada comanda.</p>
                      <p className="rounded-2xl bg-zinc-50 p-3 text-xs text-zinc-600">A forma de pagamento aparece somente quando a comanda for fechada.</p>
                    </div>
                    <Button onClick={createTabAccount} disabled={!isCashOpen} className="mt-4 rounded-2xl bg-zinc-950 text-white hover:bg-zinc-800">Abrir comanda</Button>
                    <div className="mt-4 rounded-2xl bg-zinc-50 p-3 text-sm text-zinc-600">Comandas abertas: <b>{tabsAccounts.length}</b></div>
                  </CardBox>

                  <CardBox>
                    <h3 className="font-bold text-lg mb-4">Produtos para adicionar</h3>
                    <SearchBox value={tabProductSearch} onChange={setTabProductSearch} placeholder="Buscar produto para comanda" />
                    <div className="mt-3 max-h-96 overflow-auto space-y-2 pr-1">
                      {tabProductResults.map((product) => (
                        <div key={product.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                          <p className="font-bold">{product.name}</p>
                          <p className="text-xs text-zinc-500">{product.category} • estoque {product.stock} • {money(product.price)}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {tabsAccounts.map((tab) => <Button key={tab.id} onClick={() => addProductToTab(tab.id, product)} variant="secondary" className="rounded-xl">+ {tab.customerName}</Button>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardBox>

                  <CardBox>
                    <h3 className="font-bold text-lg mb-4">Comandas abertas</h3>
                    <div className="space-y-3 max-h-[560px] overflow-auto pr-1">
                      {tabsAccounts.length === 0 && <p className="text-sm text-zinc-500">Nenhuma comanda aberta.</p>}
                      {tabsAccounts.map((tab) => {
                        const total = buildOrderTotal(tab.items);
                        return (
                          <div key={tab.id} className="rounded-3xl border border-zinc-100 bg-zinc-50 p-4 space-y-3">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                              <div>
                                <p className="font-black">{tab.customerName}</p>
                                <p className="text-xs text-zinc-500">Aberta {new Date(tab.openedAt).toLocaleString("pt-BR")}</p>
                                <p className="text-xs font-bold text-emerald-700">Limite: {money(getCurrentTabCreditLimit(tab))} • disponível: {money(getTabCreditRemaining(tab))}</p>
                              </div>
                              <p className="text-xl font-black">{money(total)}</p>
                            </div>
                            <div className="rounded-2xl border border-zinc-100 bg-white p-3">
                              <p className="text-xs font-bold text-zinc-600 mb-2">Controle do limite desta comanda</p>
                              <div className="flex flex-col md:flex-row gap-2">
                                <input type="number" value={tabLimitDrafts[tab.id] ?? getCurrentTabCreditLimit(tab)} onChange={(event) => setTabLimitDrafts((previous) => ({ ...previous, [tab.id]: event.target.value }))} className="flex-1 rounded-2xl border border-zinc-200 bg-white px-3 py-2 outline-none" />
                                <Button onClick={() => applyManualTabLimit(tab.id)} variant="secondary" className="rounded-2xl">Alterar limite</Button>
                              </div>
                            </div>
                            <div className="rounded-2xl border border-zinc-100 bg-white p-3">
                              <p className="text-xs font-bold text-zinc-600 mb-2">Adicionar produto direto nesta comanda</p>
                              <input value={tabProductSearchByTab[tab.id] || ""} onChange={(event) => setTabProductSearchByTab((previous) => ({ ...previous, [tab.id]: event.target.value }))} placeholder="Pesquisar por nome ou código de barras" className="mb-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 outline-none" />
                              {String(tabProductSearchByTab[tab.id] || "").trim() && <div className="mb-2 rounded-2xl bg-zinc-50 p-2 text-xs text-zinc-600">{getTabProductResults(tab.id)[0] ? <>Encontrado: <b>{getTabProductResults(tab.id)[0].name}</b> • {money(getTabProductResults(tab.id)[0].price)} • estoque {getTabProductResults(tab.id)[0].stock}</> : "Nenhum produto encontrado."}</div>}
                              <div className="flex flex-col md:flex-row gap-2"><input type="number" min="1" value={tabProductQuantityByTab[tab.id] || 1} onChange={(event) => setTabProductQuantityByTab((previous) => ({ ...previous, [tab.id]: event.target.value }))} className="md:w-28 rounded-2xl border border-zinc-200 bg-white px-3 py-2 outline-none" placeholder="Qtd" /><Button onClick={() => addSelectedProductToTab(tab.id)} disabled={!isCashOpen} variant="secondary" className="rounded-2xl">Adicionar</Button></div>
                            </div>
                            <div className="space-y-2">
                              {tab.items.length === 0 && <p className="text-sm text-zinc-500">Adicione produtos pela lista ao lado.</p>}
                              {tab.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white border border-zinc-100 p-2"><div className="min-w-0"><p className="text-sm font-semibold truncate">{item.name}</p><p className="text-xs text-zinc-500">{money(item.price)} un.</p></div><input type="number" min="1" value={item.quantity} onChange={(event) => updateTabItemQuantity(tab.id, item.id, event.target.value)} className="w-16 rounded-xl border border-zinc-200 px-2 py-1" /><Button onClick={() => removeTabItem(tab.id, item.id)} variant="secondary" className="rounded-xl text-red-600">remover</Button></div>)}
                            </div>
                            {closingTabId === tab.id ? (
                              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 space-y-3">
                                <label className="block"><span className="text-xs font-medium text-zinc-600">Forma de pagamento para fechar</span><select value={tabClosingPayment} onChange={(event) => { setTabClosingPayment(event.target.value); setTabClosingMixedPayment(createEmptyMixedPayment()); setTabClosingChangeFor(""); }} className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-2 outline-none"><option>Dinheiro</option><option>Pix</option><option>Cartão débito</option><option>Cartão crédito</option><option>Misto</option><option>Fiado/anotado</option></select></label>
                                {tabClosingPayment === "Dinheiro" && <div className="space-y-2"><Input label="Valor recebido / troco para quanto?" type="number" value={tabClosingChangeFor} onChange={setTabClosingChangeFor} placeholder="Ex: 100" />{tabClosingChangeFor && <div className="rounded-2xl border border-emerald-100 bg-white p-3 text-emerald-800"><p className="text-xs font-bold">Troco da comanda</p><p className="text-2xl font-black">{money(calculateChangeDue(tabClosingChangeFor, total))}</p></div>}</div>}
                                {tabClosingPayment === "Misto" && <div className="grid grid-cols-2 gap-2"><Input label="Pix" type="number" value={tabClosingMixedPayment.pix} onChange={(value) => setTabClosingMixedPayment({ ...tabClosingMixedPayment, pix: value })} /><Input label="Dinheiro" type="number" value={tabClosingMixedPayment.cash} onChange={(value) => setTabClosingMixedPayment({ ...tabClosingMixedPayment, cash: value })} /><Input label="Débito" type="number" value={tabClosingMixedPayment.debit} onChange={(value) => setTabClosingMixedPayment({ ...tabClosingMixedPayment, debit: value })} /><Input label="Crédito" type="number" value={tabClosingMixedPayment.credit} onChange={(value) => setTabClosingMixedPayment({ ...tabClosingMixedPayment, credit: value })} /><p className="col-span-2 text-xs font-bold text-zinc-600">Informado: {money(getMixedPaymentTotal(tabClosingMixedPayment))} de {money(total)}</p></div>}
                                <Input label="Senha de login da loja para fechar" type="password" value={tabClosingStorePassword} onChange={setTabClosingStorePassword} placeholder="Digite a senha da loja" />
                                <div className="flex gap-2"><Button onClick={() => closeTabAccount(tab.id)} disabled={tab.items.length === 0 || !tabClosingStorePassword} className="flex-1 rounded-2xl bg-emerald-700 text-white hover:bg-emerald-800">Confirmar e imprimir 2 vias</Button><Button onClick={cancelClosingTab} variant="secondary" className="rounded-2xl">Cancelar</Button></div>
                              </div>
                            ) : <Button onClick={() => startClosingTab(tab.id)} disabled={tab.items.length === 0 || !isCashOpen} className="w-full rounded-2xl bg-emerald-700 text-white hover:bg-emerald-800">Fechar comanda</Button>}
                          </div>
                        );
                      })}
                    </div>
                  </CardBox>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6">
                <Title title="Configurações da loja" subtitle="Altere informações importantes da loja sem mexer no código." />
                <CardBox>
                  <div className="mb-4 rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                                      <p className="font-black">Configurações da loja</p>
                      <p className="text-xs">Nome da loja, taxa, pedido mínimo, horários, WhatsApp e impressão ficam salvos neste navegador e sincronizam no Supabase quando a tabela estiver criada.</p>
                      <p className="mt-1 text-xs font-bold text-emerald-800">{storeSettingsSyncStatus}</p>
                    </div>
                    <Button onClick={resetStoreSettingsToDefault} variant="secondary" className="rounded-2xl bg-white">Restaurar padrão</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input label="Nome da loja" value={storeSettings.storeName} onChange={(value) => updateStoreSetting("storeName", value)} />
                    <Input label="WhatsApp da loja" value={storeSettings.storePhone} onChange={(value) => updateStoreSetting("storePhone", formatBrazilMobilePhone(value))} />
                    <Input label="Taxa de entrega padrão" type="number" value={storeSettings.defaultDeliveryFee} onChange={(value) => updateStoreSetting("defaultDeliveryFee", value)} />
                    <Input label="Pedido mínimo" type="number" value={storeSettings.minimumOrderValue} onChange={(value) => updateStoreSetting("minimumOrderValue", value)} />
                    <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                      <p className="text-xs font-medium text-zinc-600">Tempo estimado automático</p>
                      <p className="mt-1 text-2xl font-black text-zinc-900">{nextOrderEstimatedDeliveryLabel}</p>
                      <p className="text-xs text-zinc-500">Cada entrega ativa adiciona 7 minutos. Atualiza a cada 3 segundos.</p>
                    </div>
                    <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-zinc-600">Impressão de pedidos</p>
                        <p className="mt-1 text-lg font-black text-zinc-900">{storeSettings.autoPrintCustomerOrders === false ? "Automática desligada" : `Automática ligada • ${getAutoPrintCopies()} via${getAutoPrintCopies() > 1 ? "s" : ""}`}</p>
                        <p className="text-xs text-zinc-500">Pedidos novos feitos pelo cliente tentam abrir a impressão automaticamente. Se o navegador bloquear, use Reimprimir.</p>
                      </div>
                      <label className="flex min-h-[48px] items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-bold">
                        <input
                          type="checkbox"
                          checked={storeSettings.autoPrintCustomerOrders !== false}
                          onChange={(event) => updateStoreSetting("autoPrintCustomerOrders", event.target.checked)}
                        />
                        Imprimir automaticamente pedidos do cliente
                      </label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Input label="Vias automáticas" type="number" value={storeSettings.customerOrderPrintCopies} onChange={(value) => updateStoreSetting("customerOrderPrintCopies", value)} />
                        <Input label="Vias no Reimprimir" type="number" value={storeSettings.manualReprintCopies} onChange={(value) => updateStoreSetting("manualReprintCopies", value)} />
                        <Input label="Fechar impressão após (s)" type="number" value={storeSettings.printCloseDelaySeconds} onChange={(value) => updateStoreSetting("printCloseDelaySeconds", value)} />
                      </div>
                    </div>
                    <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-zinc-600">Funcionamento</p>
                          <p className={`mt-1 text-lg font-black ${effectiveStoreIsOpen ? "text-emerald-700" : "text-red-700"}`}>{effectiveStoreIsOpen ? "Aberto" : "Fechado"}</p>
                          <p className="text-xs text-zinc-500">{storeOpenStatus.message}</p>
                        </div>
                        <Button onClick={() => setShowStoreScheduleModal(true)} variant="secondary" className="rounded-2xl px-4">Editar</Button>
                      </div>
                    </div>
                    <div className="md:col-span-2"><Input label="Mensagem padrão para WhatsApp" value={storeSettings.whatsappMessage} onChange={(value) => updateStoreSetting("whatsappMessage", value)} /></div>
                    <div className="md:col-span-2 rounded-3xl border border-zinc-100 bg-zinc-50 p-4">
                      <p className="text-xs font-bold text-zinc-600">Horários cadastrados</p>
                      <p className="mt-1 text-sm text-zinc-700">{storeOpeningHoursSummary}</p>
                    </div>
                    <div className="md:col-span-2 rounded-3xl border border-amber-100 bg-amber-50 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-black text-amber-950">Backup operacional</p>
                        <p className="mt-1 text-xs text-amber-900">Baixe ou restaure um arquivo JSON com produtos, clientes, entregadores, pedidos, caixa, comandas, notificações e configurações atuais. Use antes de grandes alterações ou antes de subir uma nova versão.</p>
                        <p className="mt-1 text-xs font-bold text-amber-950">Resumo atual: {products.length} produtos • {clients.length} clientes • {deliveries.length} pedidos • {couriers.length} entregadores</p>
                        <p className="mt-1 text-[11px] font-semibold text-amber-800">Ao restaurar, os dados carregados na tela atual serão substituídos pelo arquivo selecionado.</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
                        <Button onClick={exportOperationalBackup} variant="secondary" className="rounded-2xl bg-white whitespace-nowrap">Baixar backup</Button>
                        <Button onClick={openBackupImportDialog} variant="secondary" className="rounded-2xl bg-white whitespace-nowrap">Restaurar backup</Button>
                        <input ref={backupFileInputRef} type="file" accept="application/json,.json" onChange={handleBackupFileSelected} className="hidden" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 rounded-3xl border border-zinc-100 bg-zinc-50 p-4 flex items-center gap-3">
                    <StoreLogo size="h-16 w-16" />
                    <div>
                      <p className="font-bold">Logo atual da loja</p>
                      <p className="text-sm text-zinc-500">No protótipo a logo está fixa. Na versão final, este campo pode aceitar upload.</p>
                    </div>
                  </div>
                </CardBox>
              </div>
            )}

            {activeTab === "clients" && (
              <div className="space-y-6">
                <Title title="Cadastro de clientes" subtitle="Cadastre clientes, pesquise registros e edite somente quando precisar." />
                <CardBox>
                  <h3 className="font-bold text-lg mb-4">Novo cliente</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Input label="Nome" value={newClient.name} onChange={(value) => setNewClient({ ...newClient, name: value })} />
                    <Input label="Telefone" value={newClient.phone} onChange={(value) => setNewClient({ ...newClient, phone: normalizePhoneInput(value) })} placeholder="(43) 98873-6791" />
                    <div><Input label="CEP" value={newClient.cep} onChange={(value) => setNewClient({ ...newClient, cep: value })} /><button onClick={searchCep} className="text-xs text-zinc-600 underline mt-1">buscar endereço pelo CEP</button></div>
                    <Input label="Rua" value={newClient.street} onChange={(value) => setNewClient({ ...newClient, street: value })} />
                    <Input label="Número" value={newClient.number} onChange={(value) => setNewClient({ ...newClient, number: value })} />
                    <Input label="Bairro" value={newClient.district} onChange={(value) => setNewClient({ ...newClient, district: value })} />
                    <Input label="Cidade" value={newClient.city} onChange={(value) => setNewClient({ ...newClient, city: value })} />
                    <Input label="Estado" value={newClient.state} onChange={(value) => setNewClient({ ...newClient, state: value.toUpperCase().slice(0, 2) })} />
                    <Input label="Ponto de referência" value={newClient.reference} onChange={(value) => setNewClient({ ...newClient, reference: value })} />
                  </div>
                  <Button onClick={addClient} className="mt-4 rounded-2xl bg-zinc-950 hover:bg-zinc-800"><span className="mr-2"><Icon name="plus" /></span>Cadastrar cliente</Button>
                </CardBox>

                <CardBox>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <h3 className="font-bold text-lg">Clientes registrados</h3>
                    <div className="w-full md:max-w-md"><SearchBox value={clientSearch} onChange={setClientSearch} placeholder="Pesquisar cliente por nome, telefone, CEP ou endereço" /></div>
                  </div>

                  <div className="grid gap-3">
                    {filteredClients.length === 0 && <p className="text-sm text-zinc-500">Nenhum cliente encontrado.</p>}
                    {filteredClients.map((client) => {
                      const isEditing = editingClientId === client.id;
                      return (
                        <div key={client.id} className="rounded-3xl border border-zinc-100 bg-zinc-50 p-4 space-y-3">
                          {!isEditing ? (
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div>
                                <p className="font-bold">{client.name}</p>
                                <p className="text-sm text-zinc-600">{formatBrazilMobilePhone(client.phone)} • CEP {client.cep}</p>
                                <p className="text-xs text-zinc-500">Histórico: {customerHistoryByClientId[client.id]?.totalOrders || 0} compra(s) • {money(customerHistoryByClientId[client.id]?.totalSpent || 0)} total</p>
                                <p className="text-sm text-zinc-500">{client.street}, {client.number} - {client.district}, {client.city}/{client.state}</p>
                                {(customerHistoryByClientId[client.id]?.lastOrders || []).length > 0 && <p className="text-xs text-zinc-500">Último pedido: #{customerHistoryByClientId[client.id].lastOrders[0].id} • {money(customerHistoryByClientId[client.id].lastOrders[0].value)}</p>}
                                {client.reference && <p className="text-xs text-zinc-500">Referência: {client.reference}</p>}
                              </div>
                              <div className="flex flex-wrap gap-2"><Button onClick={() => setEditingClientId(client.id)} variant="secondary" className="rounded-2xl">Editar cliente</Button><Button onClick={() => deleteClient(client.id)} variant="secondary" className="rounded-2xl text-red-700">Excluir cliente</Button></div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <Input label="Nome" value={client.name} onChange={(value) => updateClientField(client.id, "name", value)} />
                                <Input label="Telefone" value={client.phone} onChange={(value) => updateClientField(client.id, "phone", value)} />
                                <div><Input label="CEP" value={client.cep} onChange={(value) => updateClientField(client.id, "cep", value)} /><button onClick={() => searchExistingClientCep(client.id)} className="text-xs text-zinc-600 underline mt-1">buscar endereço pelo CEP</button></div>
                                <Input label="Número" value={client.number} onChange={(value) => updateClientField(client.id, "number", value)} />
                                <Input label="Rua" value={client.street} onChange={(value) => updateClientField(client.id, "street", value)} />
                                <Input label="Bairro" value={client.district} onChange={(value) => updateClientField(client.id, "district", value)} />
                                <Input label="Cidade" value={client.city} onChange={(value) => updateClientField(client.id, "city", value)} />
                                <Input label="Estado" value={client.state} onChange={(value) => updateClientField(client.id, "state", value)} />
                                <Input label="Ponto de referência" value={client.reference} onChange={(value) => updateClientField(client.id, "reference", value)} />
                              </div>
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <p className="text-sm text-zinc-500">Endereço atual: {client.street}, {client.number} - {client.district}, {client.city}/{client.state}</p>
                                <div className="flex gap-2">
                                  <Button onClick={() => setEditingClientId(null)} variant="secondary" className="rounded-2xl">Cancelar</Button>
                                  <Button onClick={() => saveClientEdits(client.id)} className="rounded-2xl bg-zinc-950 hover:bg-zinc-800">Salvar alterações</Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardBox>
              </div>
            )}

            {activeTab === "couriers" && (
              <div className="space-y-6">
                <Title title="Cadastro de entregadores" subtitle="Cadastre entregadores, pesquise registros e edite somente quando precisar." />

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Metric title="Entregas feitas" value={storeDeliverySummary.deliveryCount} icon="check" />
                  <Metric title="Taxas totais" value={money(storeDeliverySummary.totalDeliveryFees)} icon="money" />
                  <Metric title="Valor dos entregadores" value={money(storeDeliverySummary.courierAmount)} icon="truck" />
                  <Metric title="Parte da loja" value={money(storeDeliverySummary.storeAmount)} icon="chart" />
                </div>

                <CardBox>
                  <h3 className="font-bold text-lg mb-4">Novo entregador</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Input label="Nome do entregador" value={newCourier.name} onChange={(value) => setNewCourier({ ...newCourier, name: value })} placeholder="Ex: João Motoboy" />
                    <Input label="Usuário criado pela loja" value={newCourier.username} onChange={(value) => setNewCourier({ ...newCourier, username: value })} placeholder="Ex: moto02" />
                    <Input label="Senha forte gerada pelo app" value={newCourier.password} onChange={(value) => setNewCourier({ ...newCourier, password: value })} />
                    <label className="block">
                      <span className="text-xs font-medium text-zinc-600">Tipo de moto</span>
                      <select value={newCourier.motorcycleType} onChange={(event) => setNewCourier({ ...newCourier, motorcycleType: event.target.value })} className="mt-1 w-full min-h-[48px] rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-950/20">
                        <option>Moto própria</option>
                        <option>Moto do estabelecimento</option>
                      </select>
                    </label>
                  </div>
                  <div className="mt-4 flex flex-col md:flex-row gap-2">
                    <Button onClick={regenerateCourierPassword} variant="secondary" className="rounded-2xl">Gerar nova senha forte</Button>
                    <Button onClick={addCourier} className="rounded-2xl bg-zinc-950 hover:bg-zinc-800"><span className="mr-2"><Icon name="plus" /></span>Cadastrar entregador</Button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-3">Na versão final, a senha será salva criptografada. Neste protótipo ela aparece para você copiar e entregar ao motoboy.</p>
                </CardBox>

                <CardBox>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <h3 className="font-bold text-lg">Entregadores cadastrados</h3>
                    <div className="w-full md:max-w-md"><SearchBox value={courierSearch} onChange={setCourierSearch} placeholder="Pesquisar entregador por nome, usuário, moto ou status" /></div>
                  </div>

                  <div className="grid gap-3">
                    {filteredCouriers.length === 0 && <p className="text-sm text-zinc-500">Nenhum entregador encontrado.</p>}
                    {filteredCouriers.map((courier) => {
                      const isEditing = editingCourierId === courier.id;
                      return (
                        <div key={courier.id} className="rounded-3xl border border-zinc-100 bg-zinc-50 p-4 space-y-3">
                          {!isEditing ? (
                            <div className="space-y-3">
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <div>
                                  <p className="font-bold">{courier.name}</p>
                                  <p className="text-sm text-zinc-600">Usuário: {courier.username} • Senha: <b>{courier.password || "sem senha salva"}</b> • {courier.motorcycleType || "Moto própria"}</p>
                                  <p className="text-sm text-zinc-500">Status: {courier.active ? "Ativo" : "Bloqueado"} • Criado em: {courier.createdAt}</p>
                                </div>
                                <div className="flex flex-wrap gap-2"><Button onClick={() => setEditingCourierId(courier.id)} variant="secondary" className="rounded-2xl">Editar entregador</Button><Button onClick={() => deleteCourier(courier.id)} variant="secondary" className="rounded-2xl text-red-700">Excluir entregador</Button></div>
                              </div>

                              <div className="rounded-2xl border border-zinc-100 bg-white p-3 text-sm text-zinc-600">Acesso operacional: o entregador vê apenas pedidos disponíveis, aceitos ou em andamento. Valores ficam no painel da loja.</div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <Input label="Nome" value={courier.name} onChange={(value) => updateCourierField(courier.id, "name", value)} />
                                <Input label="Usuário" value={courier.username} onChange={(value) => updateCourierField(courier.id, "username", value)} />
                                <Input label="Senha" value={courier.password} onChange={(value) => updateCourierField(courier.id, "password", value)} />
                                <label className="block">
                                  <span className="text-xs font-medium text-zinc-600">Tipo de moto</span>
                                  <select value={courier.motorcycleType || "Moto própria"} onChange={(event) => updateCourierField(courier.id, "motorcycleType", event.target.value)} className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 outline-none">
                                    <option>Moto própria</option>
                                    <option>Moto do estabelecimento</option>
                                  </select>
                                </label>
                              </div>

                              <div className="rounded-2xl border border-zinc-100 bg-white p-3 text-sm text-zinc-600">Acesso operacional: o entregador vê apenas pedidos disponíveis, aceitos ou em andamento. Valores ficam no painel da loja.</div>

                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <p className="text-sm text-zinc-500">Edite somente o entregador necessário para economizar espaço na tela.</p>
                                <div className="flex flex-wrap gap-2">
                                  <Button onClick={() => regenerateExistingCourierPassword(courier.id)} variant="secondary" className="rounded-2xl">Gerar nova senha</Button>
                                  <Button onClick={() => toggleCourierStatus(courier.id)} variant="secondary" className="rounded-2xl">{courier.active ? "Bloquear" : "Ativar"}</Button>
                                  <Button onClick={() => setEditingCourierId(null)} variant="secondary" className="rounded-2xl">Cancelar</Button>
                                  <Button onClick={() => saveCourierEdits(courier.id)} className="rounded-2xl bg-zinc-950 hover:bg-zinc-800">Salvar alterações</Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardBox>
              </div>
            )}
          </section>
        </div>
      </main>

      {showStoreScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white">
            <CardContent className="flex max-h-[90vh] flex-col p-0">
              <div className="border-b border-zinc-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black">Horários de funcionamento</h3>
                    <p className="text-sm text-zinc-500">Configure abertura e fechamento por dia. O sistema calcula automaticamente se a loja está aberta.</p>
                  </div>
                  <Button onClick={() => setShowStoreScheduleModal(false)} variant="secondary" className="rounded-2xl px-4">Fechar</Button>
                </div>
              </div>

              <div className="overflow-y-auto p-5">
                <div className="grid gap-3">
                  {normalizedStoreSchedule.map((daySchedule) => (
                    <div key={daySchedule.day} className="rounded-3xl border border-zinc-100 bg-zinc-50 p-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_160px_160px] md:items-end">
                        <div>
                          <p className="text-sm font-black text-zinc-900">{daySchedule.label}</p>
                          <p className="text-xs text-zinc-500">{daySchedule.closed ? "Fechado o dia todo" : `Aberto das ${daySchedule.open} às ${daySchedule.close}`}</p>
                        </div>
                        <label className="flex min-h-[48px] items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-bold">
                          <input
                            type="checkbox"
                            checked={daySchedule.closed}
                            onChange={(event) => updateStoreScheduleDay(daySchedule.day, "closed", event.target.checked)}
                          />
                          Fechado
                        </label>
                        <Input
                          label="Abertura"
                          type="time"
                          value={daySchedule.open}
                          onChange={(value) => updateStoreScheduleDay(daySchedule.day, "open", normalizeTimeValue(value, daySchedule.open))}
                        />
                        <Input
                          label="Fecha"
                          type="time"
                          value={daySchedule.close}
                          onChange={(value) => updateStoreScheduleDay(daySchedule.day, "close", normalizeTimeValue(value, daySchedule.close))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-zinc-100 p-5">
                <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-600">
                  Status atual: <b className={effectiveStoreIsOpen ? "text-emerald-700" : "text-red-700"}>{effectiveStoreIsOpen ? "Aberto" : "Fechado"}</b> • {storeOpenStatus.message}
                </div>
                <Button onClick={() => setShowStoreScheduleModal(false)} className="mt-3 w-full rounded-2xl bg-zinc-950 text-white hover:bg-zinc-800">Salvar horários</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {pendingCancellation.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full rounded-3xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3"><Icon name="alert" /><h3 className="font-bold text-lg">Cancelar {pendingCancellation.orderType === ORDER_TYPE.COUNTER ? "venda" : "pedido"}</h3></div>
              <p className="text-sm text-zinc-600">Tem certeza que deseja cancelar {pendingCancellation.orderType === ORDER_TYPE.COUNTER ? "esta venda" : "este pedido"}? O estoque dos itens será devolvido automaticamente.</p>
              <label className="block">
                <span className="text-xs font-medium text-zinc-600">Motivo do cancelamento</span>
                <select value={pendingCancellation.reason} onChange={(event) => setPendingCancellation({ ...pendingCancellation, reason: event.target.value })} className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 outline-none">
                  {CANCELLATION_REASONS.map((reason) => <option key={reason}>{reason}</option>)}
                </select>
              </label>
              <Input label="Detalhes opcionais" value={pendingCancellation.details} onChange={(value) => setPendingCancellation({ ...pendingCancellation, details: value })} placeholder="Ex: cliente pediu para cancelar pelo WhatsApp" />
              <div className="flex gap-2">
                <Button onClick={cancelDelivery} className="rounded-2xl bg-red-600 hover:bg-red-700 flex-1">Cancelar {pendingCancellation.orderType === ORDER_TYPE.COUNTER ? "venda" : "pedido"}</Button>
                <Button onClick={() => setPendingCancellation({ open: false, deliveryId: null, reason: CANCELLATION_REASONS[0], details: "", orderType: ORDER_TYPE.DELIVERY })} variant="secondary" className="rounded-2xl flex-1">Voltar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {ownerPinOpen && <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><Card className="max-w-sm w-full rounded-3xl"><CardContent className="p-6"><div className="flex items-center gap-3 mb-4"><Icon name="lock" /><h3 className="font-bold text-lg">Confirmação da loja</h3></div><p className="text-sm text-zinc-600 mb-4">Ações sensíveis devem ser confirmadas com a senha/PIN do usuário da loja quando necessário.</p><Input label="PIN de confirmação" type="password" placeholder="****" /><div className="flex gap-2 mt-5"><Button onClick={() => setOwnerPinOpen(false)} className="rounded-2xl bg-zinc-950 hover:bg-zinc-800 flex-1">Confirmar</Button><Button onClick={() => setOwnerPinOpen(false)} variant="secondary" className="rounded-2xl flex-1">Fechar</Button></div></CardContent></Card></div>}
    </div>
  );


function NotificationPanel({ title, notifications, onMarkRead }) {
  const unreadCount = (notifications || []).filter((notification) => !notification.read).length;

  return (
    <Card className="rounded-3xl border-amber-200 bg-amber-50 shadow-sm">
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Icon name="bell" />
            <div>
              <h3 className="font-bold text-lg">{title}</h3>
              <p className="text-xs text-amber-800">{unreadCount > 0 ? `${unreadCount} não lida(s)` : "Tudo lido"}</p>
            </div>
          </div>
          <Button onClick={onMarkRead} disabled={unreadCount === 0} variant="secondary" className="rounded-2xl">Marcar como lidas</Button>
        </div>
        <div className="grid gap-2">
          {notifications.length === 0 ? (
            <p className="rounded-2xl bg-white p-3 text-sm text-zinc-500">Nenhuma notificação registrada.</p>
          ) : notifications.slice(0, 6).map((notification) => (
            <div key={notification.id} className={`rounded-2xl border p-3 text-sm ${notification.read ? "bg-white border-zinc-100" : "bg-white border-amber-300 ring-1 ring-amber-200"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{notification.title}</p>
                {!notification.read && <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-800">nova</span>}
              </div>
              <p className="text-zinc-600">{notification.message}</p>
              <p className="text-xs text-zinc-400 mt-1">{new Date(notification.createdAt).toLocaleString("pt-BR")}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function OwnerDeliveryCard({ delivery, isPaymentProcessing = false, onPrint, onApprove, onManualConfirm, onCancel, onPaymentStatusChange, onOpenWhatsApp, onCopyWhatsApp, onMarkWhatsAppSent }) {
  const isWaitingDeliveryApproval = delivery.status === DELIVERY_STATUS.WAITING_OWNER_APPROVAL;
  const isWaitingOrderApproval = delivery.status === DELIVERY_STATUS.WAITING_STORE_APPROVAL;
  const canConfirmPayment = delivery.status !== DELIVERY_STATUS.CANCELLED && !isWaitingOrderApproval && delivery.paymentStatus !== PAYMENT_STATUS.PAID && !isPaymentProcessing;
  const canReopenPayment = delivery.status !== DELIVERY_STATUS.CANCELLED && delivery.paymentStatus === PAYMENT_STATUS.PAID && !isPaymentProcessing;
  return (
    <Card className="rounded-3xl border-zinc-200 shadow-sm">
      <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2"><span className="font-bold text-lg">{isCounterOrder(delivery) ? "Venda" : "Pedido"} #{delivery.id}</span><span className={`text-xs px-3 py-1 rounded-full ${getStatusClass(delivery.status)}`}>{delivery.status}</span></div>
          <p className="text-sm text-zinc-700"><b>Cliente:</b> {delivery.client}</p>
          {delivery.phone && <p className="text-sm text-zinc-700 flex items-center gap-1"><Icon name="phone" /> {formatBrazilMobilePhone(delivery.phone)}</p>}
          <p className="text-sm text-zinc-700 flex items-center gap-1"><Icon name="pin" /> {delivery.address}</p>
          {delivery.reference && <p className="text-sm text-zinc-500">Referência: {delivery.reference}</p>}
          <p className="text-sm text-zinc-500">{isCounterOrder(delivery) ? "Tipo: venda no balcão" : isWaitingOrderApproval ? "Pedido aguardando aprovação da loja antes de ir aos entregadores" : "Disponível para: todos os motoboys ativos"}</p>
          {isDeliveryOrder(delivery) ? (
            <p className="text-sm text-zinc-500">Taxa entrega: {money(normalizeDeliveryFee(delivery.deliveryFee))} • Motoboy: {money(delivery.courierFee ?? calculateCourierFee(delivery.deliveryFee, delivery.motorcycleType))} • Loja: {money(delivery.storeFee ?? calculateStoreFee(delivery.deliveryFee, delivery.motorcycleType))}</p>
          ) : (
            <p className="text-sm text-zinc-500">Venda balcão sem taxa de entrega</p>
          )}
          {delivery.motorcycleType && <p className="text-sm text-zinc-500">Moto usada: {delivery.motorcycleType}</p>}
          {delivery.cancellationReason && <p className="text-sm text-red-700 font-semibold">Motivo do cancelamento: {delivery.cancellationReason}</p>}
          {delivery.pickedUpByName && <p className="text-sm text-zinc-500">Retirado por: {delivery.pickedUpByName}</p>}
          {isDeliveryOrder(delivery) && delivery.deliveredByName && !delivery.ownerApproved && <p className="text-sm text-blue-700 font-semibold">Aguardando aprovação: {delivery.deliveredByName}</p>}
          {isDeliveryOrder(delivery) && delivery.ownerApproved && <p className="text-sm text-emerald-700 font-semibold">Confirmado pela loja para: {delivery.deliveredByName || "entregador"}</p>}
          {delivery.items && <p className="text-xs text-zinc-500 mt-2">Itens: {delivery.items.map((item) => item.quantity + "x " + item.name).join(", ")}</p>}
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          <span className="font-bold text-xl">{money(delivery.value)}</span>
          {delivery.phone && (
            <div className="w-full md:w-auto rounded-2xl border border-emerald-100 bg-emerald-50 p-3 space-y-2">
              <p className="text-xs font-bold text-emerald-800">WhatsApp: {getWhatsAppStatusLabel(delivery.whatsappStatus)}</p>
              {delivery.whatsappOpenedAt && <p className="text-[11px] text-emerald-700">Aberto em {new Date(delivery.whatsappOpenedAt).toLocaleString("pt-BR")}</p>}
              {delivery.whatsappSentAt && <p className="text-[11px] text-emerald-700">Marcado em {new Date(delivery.whatsappSentAt).toLocaleString("pt-BR")}</p>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Button onClick={() => onOpenWhatsApp(delivery)} className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-xs">Enviar WhatsApp</Button>
                <Button onClick={() => onCopyWhatsApp(delivery)} variant="secondary" className="rounded-2xl text-xs">Copiar mensagem</Button>
                <Button onClick={() => onMarkWhatsAppSent(delivery)} disabled={delivery.whatsappStatus === "sent"} variant="secondary" className="rounded-2xl text-xs">Marcar enviado</Button>
              </div>
            </div>
          )}
          <span className="text-xs text-zinc-500">Produtos: {money(delivery.productsTotal ?? Number(delivery.value || 0) - (isCounterOrder(delivery) ? 0 : normalizeDeliveryFee(delivery.deliveryFee)))} • Desconto: -{money(delivery.discount || 0)} • Entrega: {money(isCounterOrder(delivery) ? 0 : normalizeDeliveryFee(delivery.deliveryFee))}</span>
          <span className="text-sm text-zinc-500">Pagamento: {getPaymentLabel(delivery.payment, delivery.changeFor, delivery.mixedPaymentDetails)}</span>
          <span className={`rounded-2xl border px-3 py-2 text-xs font-bold ${getPaymentStatusClass(delivery.paymentStatus)}`}>{delivery.paymentStatus || PAYMENT_STATUS.PENDING}</span>
          {delivery.paymentConfirmedAt && <span className="text-[11px] text-zinc-500">Recebido em {new Date(delivery.paymentConfirmedAt).toLocaleString("pt-BR")}{delivery.paymentConfirmedBy ? ` por ${delivery.paymentConfirmedBy}` : ""}</span>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full md:w-auto">
            <Button onClick={() => onApprove(delivery.id)} disabled={!isDeliveryOrder(delivery) || (!isWaitingOrderApproval && !isWaitingDeliveryApproval) || delivery.status === DELIVERY_STATUS.CANCELLED} className="rounded-2xl bg-emerald-700 hover:bg-emerald-800">Aprovar entrega</Button>
            <Button onClick={() => onPrint(delivery)} variant="secondary" className="rounded-2xl">Reimprimir</Button>
            <Button onClick={() => onPaymentStatusChange(delivery.id, PAYMENT_STATUS.PAID)} disabled={!canConfirmPayment} variant="secondary" className="rounded-2xl text-emerald-700">{isPaymentProcessing ? "Aguarde..." : "Confirmar pagamento"}</Button>
            <Button onClick={() => onPaymentStatusChange(delivery.id, isDeliveryOrder(delivery) ? PAYMENT_STATUS.RECEIVABLE : PAYMENT_STATUS.PENDING)} disabled={!canReopenPayment} variant="secondary" className="rounded-2xl text-amber-700">Reabrir recebimento</Button>
            <Button onClick={() => onCancel(delivery.id)} disabled={(delivery.status === DELIVERY_STATUS.CONFIRMED_DELIVERED && isDeliveryOrder(delivery)) || delivery.status === DELIVERY_STATUS.CANCELLED} variant="secondary" className="rounded-2xl text-red-600">Cancelar pedido</Button>
            <Button onClick={() => onManualConfirm(delivery.id)} disabled={!isDeliveryOrder(delivery) || isWaitingOrderApproval || delivery.status === DELIVERY_STATUS.CONFIRMED_DELIVERED || delivery.status === DELIVERY_STATUS.CANCELLED} className="rounded-2xl bg-zinc-950 hover:bg-zinc-800">Finalizar entrega</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardTab({ dayReport, selfTests, passedTests, products, clients, couriers, deliveries, storeDeliverySummary, notifications = [], onInactivateProduct }) {
  const latestDeliveries = [...deliveries].slice(0, 5);
  const activeCouriers = couriers.filter((courier) => courier.active).length;
  const blockedCouriers = couriers.length - activeCouriers;
  const criticalProducts = products.filter((product) => Number(product.stock) <= Number(product.minStock));

  return (
    <div className="space-y-6">
      <Title title="Painel geral da loja" subtitle="Visão geral da loja, entregas, estoque, clientes, entregadores, valores e notificações." />

      {notifications.length > 0 && (
        <CardBox>
          <h3 className="font-bold text-lg mb-4">Últimas notificações</h3>
          <div className="grid gap-2">
            {notifications.slice(0, 4).map((notification) => (
              <div key={notification.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3 text-sm">
                <p className="font-bold">{notification.title}</p>
                <p className="text-zinc-600">{notification.message}</p>
                <p className="text-xs text-zinc-400 mt-1">{new Date(notification.createdAt).toLocaleString("pt-BR")}</p>
              </div>
            ))}
          </div>
        </CardBox>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Metric title="Total vendido" value={money(dayReport.totalDelivery)} icon="money" />
        <Metric title="Pedidos lançados" value={deliveries.length} icon="truck" />
        <Metric title="Tempo estimado" value={nextOrderEstimatedDeliveryLabel} icon="calendar" />
        <Metric title="Vendas balcão" value={dayReport.counterOrders} icon="money" />
        <Metric title="Clientes cadastrados" value={clients.length} icon="users" />
        <Metric title="Entregadores ativos" value={activeCouriers} icon="truck" />
      </div>

      <CardBox>
        <h3 className="font-bold text-lg mb-4">Entregas por status</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Metric title="Aguardando retirada" value={dayReport.waitingPickup} icon="calendar" />
          <Metric title="Saiu para entrega" value={dayReport.outForDelivery} icon="truck" />
          <Metric title="Aguardando aprovação" value={dayReport.waitingApproval} icon="alert" />
          <Metric title="Confirmadas" value={dayReport.delivered} icon="check" />
          <Metric title="Problemas" value={dayReport.deliveryProblem} icon="alert" />
          <Metric title="Cancelados" value={dayReport.cancelled} icon="alert" />
        </div>
      </CardBox>

      <CardBox>
        <h3 className="font-bold text-lg mb-4">Resumo financeiro geral</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Metric title="Produtos vendidos" value={money(dayReport.productsTotal)} icon="package" />
          <Metric title="Vendas entrega" value={money(dayReport.deliverySalesTotal)} icon="truck" />
          <Metric title="Vendas balcão" value={money(dayReport.counterSalesTotal)} icon="money" />
          <Metric title="Taxas de entrega" value={money(dayReport.deliveryFeesTotal)} icon="money" />
          <Metric title="Descontos dados" value={money(dayReport.discountsTotal)} icon="percent" />
          <Metric title="Parte da loja confirmada" value={money(storeDeliverySummary.storeAmount)} icon="chart" />
        </div>
      </CardBox>

      <CardBox>
        <h3 className="font-bold text-lg mb-4">Produtos e estoque</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Metric title="Produtos cadastrados" value={products.length} icon="package" />
          <Metric title="Produtos ativos" value={dayReport.activeProducts} icon="check" />
          <Metric title="Produtos inativos" value={dayReport.inactiveProducts} icon="alert" />
          <Metric title="Estoque baixo" value={dayReport.lowStock} icon="alert" />
          <Metric title="Sem estoque" value={dayReport.outOfStock} icon="alert" />
        </div>
        {criticalProducts.length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="font-bold text-amber-800 mb-2">Produtos que precisam de atenção</p>
            <div className="grid gap-2">
              {criticalProducts.map((product) => (
                <div key={product.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 text-sm text-amber-900">
                  <span>{product.name}</span>
                  <span>Estoque: {product.stock} • mínimo: {product.minStock} • status: {product.active ? "Ativo" : "Inativo"}</span>
                  {Number(product.stock || 0) <= 0 && product.active && <button onClick={() => onInactivateProduct?.(product.id)} className="rounded-xl bg-red-600 px-3 py-1 text-xs font-bold text-white">Inativar sem estoque</button>}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardBox>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CardBox>
          <h3 className="font-bold text-lg mb-4">Últimos pedidos e vendas lançados</h3>
          <div className="grid gap-3">
            {latestDeliveries.map((delivery) => (
              <div key={delivery.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="font-bold">{isCounterOrder(delivery) ? "Venda" : "Pedido"} #{delivery.id} • {delivery.client}</p>
                    <p className="text-sm text-zinc-500">{delivery.address}</p>
                    <p className="text-xs text-zinc-500">Pagamento: {getPaymentLabel(delivery.payment, delivery.changeFor)} • Total: {money(delivery.value)}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full w-fit ${getStatusClass(delivery.status)}`}>{delivery.status}</span>
                </div>
              </div>
            ))}
          </div>
        </CardBox>

        <CardBox>
          <h3 className="font-bold text-lg mb-4">Equipe de entrega</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Metric title="Cadastrados" value={couriers.length} icon="users" />
            <Metric title="Ativos" value={activeCouriers} icon="check" />
            <Metric title="Bloqueados" value={blockedCouriers} icon="alert" />
          </div>
          <div className="grid gap-2">
            {couriers.map((courier) => (
              <div key={courier.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 rounded-2xl bg-zinc-50 border border-zinc-100 p-3 text-sm">
                <span className="font-semibold">{courier.name} • {courier.username}</span>
                <span className="text-zinc-500">{courier.active ? "Ativo" : "Bloqueado"} • {courier.motorcycleType || "Moto própria"}</span>
              </div>
            ))}
          </div>
        </CardBox>
      </div>

      <CardBox>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-lg">Testes internos do sistema</h3>
            <p className="text-sm text-zinc-500">Esses testes ajudam a garantir que as regras básicas continuam funcionando.</p>
          </div>
          <span className="text-sm font-bold bg-zinc-950 text-white rounded-2xl px-4 py-2 w-fit">{passedTests}/{selfTests.length} aprovados</span>
        </div>
        <div className="grid md:grid-cols-2 gap-2">{selfTests.map((test) => <div key={test.name} className="flex items-center gap-2 rounded-2xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm"><span>{test.passed ? "✅" : "❌"}</span><span>{test.name}</span></div>)}</div>
      </CardBox>
    </div>
  );
}


}

export default function SafeApp() {
  return (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}
