import { supabase } from "../supabaseClient";
import { DELIVERY_STATUS, PAYMENT_STATUS, ORDER_TYPE } from "../constants/appConstants";
import { toNullableNumber, toPositiveInteger, toSafeMoneyNumber } from "../utils/numbers";
import { normalizeDeliveryFee } from "../utils/delivery";
import { expandItemsForStock } from "../utils/stock";
import { insertWithSchemaRetry, updateWithSchemaRetry } from "./supabaseSchema";

export function mapOrderPaymentFromDatabase(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    cashSessionId: row.cash_session_id || "",
    method: row.method || "Outro",
    amount: Number(row.amount || 0),
    status: row.status || "paid",
    notes: row.notes || "",
    createdAt: row.created_at || "",
  };
}

export async function fetchOrderPaymentsFromSupabase() {
  const { data, error } = await supabase.from("order_payments").select("*");
  return {
    data: (Array.isArray(data) ? data : []).map(mapOrderPaymentFromDatabase),
    error,
  };
}

export function mapOrderFromDatabase(order, items = []) {
  const orderStatus = order.status || DELIVERY_STATUS.WAITING_PICKUP;
  const isReleasedToCourier = orderStatus !== DELIVERY_STATUS.WAITING_STORE_APPROVAL;
  return {
    id: order.id,
    orderType: order.order_type || ORDER_TYPE.DELIVERY,
    client: order.client || order.customer_name || "Cliente",
    phone: order.phone || "",
    address: order.address || "",
    payment: order.payment || "Pix",
    paymentStatus: order.payment_status || PAYMENT_STATUS.PENDING,
    changeFor: order.change_for || "",
    productsTotal: Number(order.products_total || 0),
    deliveryFee: normalizeDeliveryFee(order.delivery_fee),
    discount: Number(order.discount || 0),
    courierFee: Number(order.courier_fee || 0),
    storeFee: Number(order.store_fee || 0),
    motorcycleType: order.motorcycle_type || "",
    value: Number(order.value || 0),
    estimatedDeliveryMinutes: Number(order.estimated_delivery_minutes || 0),
    whatsappStatus: order.whatsapp_status || "not_sent",
    whatsappOpenedAt: order.whatsapp_opened_at || "",
    whatsappSentAt: order.whatsapp_sent_at || "",
    whatsappMessage: order.whatsapp_message || "",
    status: orderStatus,
    origin: order.origin || "store",
    needsStoreApproval: orderStatus === DELIVERY_STATUS.WAITING_STORE_APPROVAL || (order.needs_store_approval === true && !isReleasedToCourier),
    storeOrderApproved: order.store_order_approved === true || isReleasedToCourier,
    approvedAt: order.approved_at || (isReleasedToCourier ? order.updated_at || order.created_at || "" : ""),
    cashSessionId: order.cash_session_id || "",
    originType: order.origin_type || order.origin || "",
    tabAccountId: order.tab_account_id || null,
    acceptedByUsername: order.accepted_by_username || "",
    acceptedByName: order.accepted_by_name || "",
    acceptedAt: order.accepted_at || "",
    refusedByUsername: order.refused_by_username || "",
    refusedAt: order.refused_at || "",
    finalizedAt: order.finalized_at || "",
    finalizedBy: order.finalized_by || "",
    problemReason: order.problem_reason || "",
    problemAt: order.problem_at || "",
    proofUrl: order.proof_url || "",
    reference: order.reference || "",
    courierUsername: order.courier_username || "ALL",
    courierName: order.courier_name || "Todos os motoboys",
    notes: order.notes || "",
    items: (Array.isArray(items) ? items : []).map((item) => ({
      id: item.product_id ?? item.id,
      name: item.name || item.product_name || "Produto",
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 0),
      barcode: item.barcode || "",
      isKit: item.is_kit === true,
      kitId: item.kit_id || null,
    })),
    pickedUpByUsername: order.picked_up_by_username || "",
    pickedUpByName: order.picked_up_by_name || "",
    pickedUpAt: order.picked_up_at || "",
    deliveredByUsername: order.delivered_by_username || "",
    deliveredByName: order.delivered_by_name || "",
    deliveredAt: order.delivered_at || "",
    ownerApproved: order.owner_approved === true,
    ownerApprovedAt: order.owner_approved_at || "",
    cancelledAt: order.cancelled_at || "",
    cancellationReason: order.cancellation_reason || "",
    launchedAt: order.launched_at || order.created_at || new Date().toISOString(),
  };
}

export function mapOrderToDatabase(delivery) {
  return {
    id: delivery.id,
    cash_session_id: delivery.cashSessionId || null,
    origin_type: delivery.originType || delivery.origin || "",
    tab_account_id: delivery.tabAccountId || null,
    order_type: delivery.orderType || ORDER_TYPE.DELIVERY,
    client: delivery.client || "Cliente",
    phone: delivery.phone || "",
    address: delivery.address || "",
    payment: delivery.payment || "Pix",
    payment_status: delivery.paymentStatus || PAYMENT_STATUS.PENDING,
    change_for: toNullableNumber(delivery.changeFor),
    products_total: Number(delivery.productsTotal || 0),
    delivery_fee: normalizeDeliveryFee(delivery.deliveryFee),
    discount: Number(delivery.discount || 0),
    courier_fee: Number(delivery.courierFee || 0),
    store_fee: Number(delivery.storeFee || 0),
    motorcycle_type: delivery.motorcycleType || "",
    value: Number(delivery.value || 0),
    estimated_delivery_minutes: Number(delivery.estimatedDeliveryMinutes || 0),
    whatsapp_status: delivery.whatsappStatus || "not_sent",
    whatsapp_opened_at: delivery.whatsappOpenedAt || null,
    whatsapp_sent_at: delivery.whatsappSentAt || null,
    whatsapp_message: delivery.whatsappMessage || "",
    status: delivery.status || DELIVERY_STATUS.WAITING_PICKUP,
    origin: delivery.origin || "store",
    needs_store_approval: delivery.needsStoreApproval === true,
    store_order_approved: delivery.storeOrderApproved === true,
    approved_at: delivery.approvedAt || null,
    reference: delivery.reference || "",
    courier_username: delivery.courierUsername || "ALL",
    courier_name: delivery.courierName || "Todos os motoboys",
    notes: delivery.notes || "",
    picked_up_by_username: delivery.pickedUpByUsername || "",
    picked_up_by_name: delivery.pickedUpByName || "",
    picked_up_at: delivery.pickedUpAt || null,
    delivered_by_username: delivery.deliveredByUsername || "",
    delivered_by_name: delivery.deliveredByName || "",
    delivered_at: delivery.deliveredAt || null,
    owner_approved: delivery.ownerApproved === true,
    owner_approved_at: delivery.ownerApprovedAt || null,
    cancelled_at: delivery.cancelledAt || null,
    cancellation_reason: delivery.cancellationReason || "",
    accepted_by_username: delivery.acceptedByUsername || "",
    accepted_by_name: delivery.acceptedByName || "",
    accepted_at: delivery.acceptedAt || null,
    refused_by_username: delivery.refusedByUsername || "",
    refused_at: delivery.refusedAt || null,
    finalized_at: delivery.finalizedAt || null,
    finalized_by: delivery.finalizedBy || "",
    problem_reason: delivery.problemReason || "",
    problem_at: delivery.problemAt || null,
    proof_url: delivery.proofUrl || "",
    launched_at: delivery.launchedAt || new Date().toISOString(),
  };
}

export function mapOrderItemsToDatabase(orderId, items = [], cashSessionId = null) {
  return expandItemsForStock(items).map((item) => ({
    order_id: orderId,
    cash_session_id: cashSessionId || null,
    product_id: Number.isFinite(Number(item.id)) ? Number(item.id) : null,
    name: item.name || "Produto",
    quantity: Number(item.quantity || 0),
    price: Number(item.price || 0),
    barcode: item.barcode || "",
    is_kit: item.isKit === true,
    kit_id: item.kitId || null,
  }));
}

export async function loadDeliveriesFromSupabase() {
  const { data: ordersData, error: ordersError } = await supabase.from("orders").select("*");
  if (ordersError) return { data: [], ordersError, itemsError: null, counts: { orders: 0, items: 0, deliveries: 0 } };

  const sortedOrders = (Array.isArray(ordersData) ? ordersData : []).slice().sort((a, b) => {
    const aTime = new Date(a.launched_at || a.created_at || 0).getTime() || Number(a.id || 0);
    const bTime = new Date(b.launched_at || b.created_at || 0).getTime() || Number(b.id || 0);
    return bTime - aTime;
  });

  const { data: itemsData, error: itemsError } = await supabase.from("order_items").select("*");
  if (itemsError) {
    return {
      data: sortedOrders.map((order) => mapOrderFromDatabase(order, [])),
      ordersError: null,
      itemsError,
      counts: { orders: sortedOrders.length, items: 0, deliveries: sortedOrders.length },
    };
  }

  const itemsByOrder = (itemsData || []).reduce((acc, item) => {
    const key = item.order_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const deliveries = sortedOrders.map((order) => mapOrderFromDatabase(order, itemsByOrder[order.id] || []));
  return {
    data: deliveries,
    ordersError: null,
    itemsError: null,
    counts: { orders: sortedOrders.length, items: Array.isArray(itemsData) ? itemsData.length : 0, deliveries: deliveries.length },
  };
}

export async function insertOrderWithItemsInSupabase(delivery, cashSessionId = null) {
  const { error: orderError, ignoredColumns: ignoredOrderColumns } = await insertWithSchemaRetry("orders", mapOrderToDatabase(delivery), false);
  if (orderError) return { error: orderError, ignoredOrderColumns, ignoredItemColumns: [] };

  const itemsPayload = mapOrderItemsToDatabase(delivery.id, delivery.items || [], cashSessionId);
  if (itemsPayload.length > 0) {
    const { error: itemsError, ignoredColumns: ignoredItemColumns } = await insertWithSchemaRetry("order_items", itemsPayload, false);
    if (itemsError) return { error: itemsError, ignoredOrderColumns, ignoredItemColumns };
    return { error: null, ignoredOrderColumns, ignoredItemColumns };
  }

  return { error: null, ignoredOrderColumns, ignoredItemColumns: [] };
}

export function buildOrderPaymentRows(delivery, fallbackCashSessionId = null) {
  const cashSessionId = delivery.cashSessionId || fallbackCashSessionId || null;
  if (!cashSessionId) return [];
  const total = toSafeMoneyNumber(delivery.value, 0);
  if (total <= 0) return [];
  if (delivery.payment === "Misto" && delivery.mixedPayment) {
    return [
      ["Pix", delivery.mixedPayment.pix],
      ["Dinheiro", delivery.mixedPayment.cash],
      ["Cartão débito", delivery.mixedPayment.debit],
      ["Cartão crédito", delivery.mixedPayment.credit],
    ].filter(([, amount]) => toSafeMoneyNumber(amount, 0) > 0).map(([method, amount]) => ({
      order_id: delivery.id,
      cash_session_id: cashSessionId,
      method,
      amount: toSafeMoneyNumber(amount, 0),
      status: delivery.paymentStatus === PAYMENT_STATUS.PAID ? "paid" : "pending",
      notes: delivery.mixedPaymentDetails || "Pagamento misto",
    }));
  }
  const method = delivery.payment === "Fiado/anotado" || delivery.paymentStatus === PAYMENT_STATUS.STORE_CREDIT ? "Fiado" : (delivery.payment || "Outro");
  return [{
    order_id: delivery.id,
    cash_session_id: cashSessionId,
    method: ["Pix", "Dinheiro", "Cartão débito", "Cartão crédito", "Fiado", "Pendente", "Outro"].includes(method) ? method : "Outro",
    amount: total,
    status: delivery.paymentStatus === PAYMENT_STATUS.PAID ? "paid" : "pending",
    notes: delivery.notes || "",
  }];
}

export async function cancelExistingOrderPaymentsInSupabase(orderId, reason = "substituído") {
  if (!orderId) return { error: null };
  const { error } = await supabase
    .from("order_payments")
    .update({ status: "cancelled", notes: `Pagamento ${reason}` })
    .eq("order_id", orderId)
    .neq("status", "cancelled");
  return { error };
}

export async function saveOrderPaymentsInSupabase(delivery, fallbackCashSessionId = null) {
  const rows = buildOrderPaymentRows(delivery, fallbackCashSessionId);
  if (!rows.length) return { rows: [], error: null };
  const cancelResult = await cancelExistingOrderPaymentsInSupabase(delivery.id, "substituído por novo registro");
  if (cancelResult.error) console.warn("Pagamentos anteriores não foram cancelados:", cancelResult.error);
  const { error } = await insertWithSchemaRetry("order_payments", rows, false);
  return { rows, error };
}

export async function saveStockMovementsInSupabase({ delivery, movementType = "sale", products = [], cashSessionId = null, createdBy = "sistema" }) {
  const stockItems = expandItemsForStock(delivery.items || []);
  if (!stockItems.length) return { error: null };
  const rows = stockItems.map((item) => {
    const product = products.find((currentProduct) => Number(currentProduct.id) === Number(item.id));
    const quantity = toPositiveInteger(item.quantity, 0);
    const before = Number(product?.stock || 0);
    const after = movementType === "cancel" ? before + quantity : Math.max(0, before - quantity);
    return {
      product_id: Number.isFinite(Number(item.id)) ? Number(item.id) : null,
      order_id: delivery.id,
      cash_session_id: cashSessionId,
      movement_type: movementType,
      quantity,
      stock_before: before,
      stock_after: after,
      reason: movementType === "cancel" ? "Cancelamento/devolução" : "Venda/pedido",
      created_by: createdBy,
      created_at: new Date().toISOString(),
    };
  });
  const { error } = await insertWithSchemaRetry("product_stock_movements", rows, false);
  return { error };
}

export async function updateOrderInSupabase(id, patch) {
  const dbPatch = {};
  const fieldMap = {
    cashSessionId: "cash_session_id",
    originType: "origin_type",
    tabAccountId: "tab_account_id",
    orderType: "order_type",
    paymentStatus: "payment_status",
    changeFor: "change_for",
    productsTotal: "products_total",
    deliveryFee: "delivery_fee",
    courierFee: "courier_fee",
    storeFee: "store_fee",
    motorcycleType: "motorcycle_type",
    estimatedDeliveryMinutes: "estimated_delivery_minutes",
    whatsappStatus: "whatsapp_status",
    whatsappOpenedAt: "whatsapp_opened_at",
    whatsappSentAt: "whatsapp_sent_at",
    whatsappMessage: "whatsapp_message",
    origin: "origin",
    needsStoreApproval: "needs_store_approval",
    storeOrderApproved: "store_order_approved",
    approvedAt: "approved_at",
    courierUsername: "courier_username",
    courierName: "courier_name",
    pickedUpByUsername: "picked_up_by_username",
    pickedUpByName: "picked_up_by_name",
    pickedUpAt: "picked_up_at",
    deliveredByUsername: "delivered_by_username",
    deliveredByName: "delivered_by_name",
    deliveredAt: "delivered_at",
    ownerApproved: "owner_approved",
    ownerApprovedAt: "owner_approved_at",
    cancelledAt: "cancelled_at",
    cancellationReason: "cancellation_reason",
    acceptedByUsername: "accepted_by_username",
    acceptedByName: "accepted_by_name",
    acceptedAt: "accepted_at",
    refusedByUsername: "refused_by_username",
    refusedAt: "refused_at",
    finalizedAt: "finalized_at",
    finalizedBy: "finalized_by",
    problemReason: "problem_reason",
    problemAt: "problem_at",
    proofUrl: "proof_url",
    launchedAt: "launched_at",
  };

  Object.entries(patch || {}).forEach(([key, value]) => {
    const dbKey = fieldMap[key] || key;
    dbPatch[dbKey] = dbKey === "change_for" ? toNullableNumber(value) : value === "" ? null : value;
  });

  if (Object.keys(dbPatch).length === 0) return { error: null, ignoredColumns: [] };
  return updateWithSchemaRetry("orders", id, dbPatch);
}
