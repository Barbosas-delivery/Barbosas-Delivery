import { supabase } from "../supabaseClient";
import { ORDER_TYPE, PRINT_JOB_SOURCE, PRINT_JOB_STATUS, PRINT_JOB_TYPE } from "../constants/appConstants";
import { normalizeDeliveryFee } from "../utils/delivery";
import { toSafeMoneyNumber } from "../utils/numbers";
import { buildPrintTicket } from "../utils/printJobTemplates";

function normalizeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizePrintItem(item = {}) {
  const quantity = Math.max(1, Number(item.quantity || 1));
  const unitPrice = toSafeMoneyNumber(item.price, 0);
  return {
    productId: item.id ?? item.productId ?? null,
    name: normalizeText(item.name, "Produto"),
    quantity,
    unitPrice,
    total: unitPrice * quantity,
    barcode: normalizeText(item.barcode),
    isKit: item.isKit === true,
    kitId: item.kitId || null,
  };
}

function getPrintJobSource(delivery = {}) {
  if ((delivery.orderType || ORDER_TYPE.DELIVERY) === ORDER_TYPE.COUNTER) return PRINT_JOB_SOURCE.PDV_COUNTER;
  if (delivery.origin === "customer") return PRINT_JOB_SOURCE.CUSTOMER_APP;
  return PRINT_JOB_SOURCE.PDV_DELIVERY;
}

export function getPrintTypesForOrder(delivery = {}) {
  if ((delivery.orderType || ORDER_TYPE.DELIVERY) === ORDER_TYPE.COUNTER) return [PRINT_JOB_TYPE.COUNTER];
  return [PRINT_JOB_TYPE.KITCHEN, PRINT_JOB_TYPE.DELIVERY];
}

export function buildPrintJobId(sourceId, printType) {
  return `order-${String(sourceId || "").trim()}-${printType}`;
}

export function buildPrintJobPayload(delivery = {}, printType = PRINT_JOB_TYPE.KITCHEN) {
  const items = Array.isArray(delivery.items) ? delivery.items.map(normalizePrintItem) : [];
  const isCounter = (delivery.orderType || ORDER_TYPE.DELIVERY) === ORDER_TYPE.COUNTER;
  const productsTotal = toSafeMoneyNumber(delivery.productsTotal, items.reduce((sum, item) => sum + item.total, 0));
  const deliveryFee = isCounter ? 0 : normalizeDeliveryFee(delivery.deliveryFee);
  const discount = toSafeMoneyNumber(delivery.discount, 0);
  const total = toSafeMoneyNumber(delivery.value, productsTotal + deliveryFee - discount);
  const source = getPrintJobSource(delivery);
  const createdAt = new Date().toISOString();
  const payload = {
    schemaVersion: 2,
    templateVersion: "6.0.40",
    printType,
    source,
    createdAt,
    order: {
      id: String(delivery.id || ""),
      orderType: delivery.orderType || ORDER_TYPE.DELIVERY,
      origin: delivery.origin || "store",
      originType: delivery.originType || delivery.origin || "",
      status: delivery.status || "",
      launchedAt: delivery.launchedAt || delivery.createdAt || createdAt,
      notes: normalizeText(delivery.notes),
      reference: normalizeText(delivery.reference),
    },
    customer: {
      name: normalizeText(delivery.client, "Cliente"),
      phone: normalizeText(delivery.phone),
    },
    delivery: {
      address: normalizeText(delivery.address),
      district: normalizeText(delivery.deliveryDistrict),
      zone: normalizeText(delivery.deliveryZone),
      courierName: normalizeText(delivery.courierName),
    },
    payment: {
      method: normalizeText(delivery.payment, "Pix"),
      status: normalizeText(delivery.paymentStatus),
      changeFor: delivery.changeFor || "",
      mixedPaymentDetails: delivery.mixedPaymentDetails || "",
    },
    items,
    totals: {
      productsTotal,
      deliveryFee,
      discount,
      total,
    },
  };

  return {
    ...payload,
    ticket: buildPrintTicket(payload, printType),
  };
}

export function buildPrintJobRowsForOrder(delivery = {}) {
  const sourceId = String(delivery.id || "").trim();
  if (!sourceId) return [];
  const source = getPrintJobSource(delivery);
  return getPrintTypesForOrder(delivery).map((printType) => ({
    id: buildPrintJobId(sourceId, printType),
    source,
    source_id: sourceId,
    print_type: printType,
    status: PRINT_JOB_STATUS.PENDING,
    payload: buildPrintJobPayload(delivery, printType),
    copies: 1,
    attempts: 0,
    error_message: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

export async function createPrintJobsForOrder(delivery = {}) {
  const rows = buildPrintJobRowsForOrder(delivery);
  if (!rows.length) return { jobs: [], error: null };

  const { data, error } = await supabase
    .from("print_jobs")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: true })
    .select("id, source, source_id, print_type, status");

  return {
    jobs: Array.isArray(data) ? data : rows,
    error,
  };
}
