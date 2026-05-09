import {
  DELIVERY_STATUS,
  PAYMENT_STATUS,
  ORDER_TYPE,
  DELIVERY_FEE,
  COURIER_DELIVERY_SHARE,
  STORE_DELIVERY_SHARE,
} from "../constants/appConstants";
import { escapeHtml } from "./formatters";
import { toSafeMoneyNumber, toPositiveInteger } from "./numbers";

function isDeliveryOrder(order) {
  if (!order) return false;
  return !order.orderType || order.orderType === ORDER_TYPE.DELIVERY;
}

function isCounterOrder(order) {
  if (!order) return false;
  return order.orderType === ORDER_TYPE.COUNTER;
}

function normalizeDeliveryFee(value) {
  if (value === "" || value === null || value === undefined) return DELIVERY_FEE;
  return Math.max(0, Number(value || 0));
}

function isStoreMotorcycle(motorcycleType) {
  return String(motorcycleType || "").toLowerCase() === "moto do estabelecimento";
}

function calculateCourierFee(deliveryFee = DELIVERY_FEE, motorcycleType = "Moto do estabelecimento") {
  const finalFee = normalizeDeliveryFee(deliveryFee);
  return isStoreMotorcycle(motorcycleType) ? finalFee * COURIER_DELIVERY_SHARE : finalFee;
}

function calculateStoreFee(deliveryFee = DELIVERY_FEE, motorcycleType = "Moto do estabelecimento") {
  const finalFee = normalizeDeliveryFee(deliveryFee);
  return isStoreMotorcycle(motorcycleType) ? finalFee * STORE_DELIVERY_SHARE : 0;
}

export function buildDayReport(products, deliveries) {
  const activeDeliveries = deliveries.filter((delivery) => delivery.status !== DELIVERY_STATUS.CANCELLED);
  const deliveryOrders = deliveries.filter((delivery) => isDeliveryOrder(delivery));
  const activeDeliveryOrders = deliveryOrders.filter((delivery) => delivery.status !== DELIVERY_STATUS.CANCELLED);
  const counterOrders = deliveries.filter((delivery) => isCounterOrder(delivery));
  const activeCounterOrders = counterOrders.filter((delivery) => delivery.status !== DELIVERY_STATUS.CANCELLED);
  const cancelled = deliveries.filter((delivery) => delivery.status === DELIVERY_STATUS.CANCELLED).length;
  const totalDelivery = activeDeliveries.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const deliverySalesTotal = activeDeliveryOrders.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const counterSalesTotal = activeCounterOrders.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const delivered = activeDeliveryOrders.filter((delivery) => delivery.status === DELIVERY_STATUS.CONFIRMED_DELIVERED).length;
  const pending = activeDeliveryOrders.filter((delivery) => delivery.status !== DELIVERY_STATUS.CONFIRMED_DELIVERED).length;
  const lowStock = products.filter((product) => Number(product.stock) <= Number(product.minStock)).length;
  const outOfStock = products.filter((product) => Number(product.stock) <= 0).length;
  const activeProducts = products.filter((product) => product.active).length;
  const inactiveProducts = products.filter((product) => !product.active).length;
  const waitingPickup = activeDeliveryOrders.filter((delivery) => delivery.status === DELIVERY_STATUS.WAITING_PICKUP).length;
  const outForDelivery = activeDeliveryOrders.filter((delivery) => delivery.status === DELIVERY_STATUS.OUT_FOR_DELIVERY).length;
  const waitingApproval = activeDeliveryOrders.filter((delivery) => delivery.status === DELIVERY_STATUS.WAITING_OWNER_APPROVAL).length;
  const deliveryProblem = activeDeliveryOrders.filter((delivery) => delivery.status === DELIVERY_STATUS.DELIVERY_PROBLEM).length;
  const productsTotal = activeDeliveries.reduce((sum, delivery) => sum + Number(delivery.productsTotal || 0), 0);
  const discountsTotal = activeDeliveries.reduce((sum, delivery) => sum + Number(delivery.discount || 0), 0);
  const deliveryFeesTotal = activeDeliveryOrders.reduce((sum, delivery) => sum + normalizeDeliveryFee(delivery.deliveryFee), 0);
  const byPayment = ["Pix", "Dinheiro", "Cartão débito", "Cartão crédito"].reduce((acc, payment) => {
    acc[payment] = activeDeliveries.filter((delivery) => delivery.payment === payment).reduce((sum, delivery) => sum + Number(delivery.value || 0), 0);
    return acc;
  }, {});
  const paidTotal = activeDeliveries.filter((delivery) => delivery.paymentStatus === PAYMENT_STATUS.PAID).reduce((sum, delivery) => sum + Number(delivery.value || 0), 0);
  const pendingPaymentTotal = activeDeliveries.filter((delivery) => delivery.paymentStatus !== PAYMENT_STATUS.PAID).reduce((sum, delivery) => sum + Number(delivery.value || 0), 0);
  return {
    totalDelivery,
    delivered,
    pending,
    cancelled,
    lowStock,
    outOfStock,
    activeProducts,
    inactiveProducts,
    waitingPickup,
    outForDelivery,
    waitingApproval,
    deliveryProblem,
    deliveryOrders: activeDeliveryOrders.length,
    counterOrders: activeCounterOrders.length,
    deliverySalesTotal,
    counterSalesTotal,
    productsTotal,
    discountsTotal,
    deliveryFeesTotal,
    byPayment,
    paidTotal,
    pendingPaymentTotal,
  };
}

export function getPaidActiveOrders(deliveries = []) {
  return (Array.isArray(deliveries) ? deliveries : []).filter((delivery) => delivery.status !== DELIVERY_STATUS.CANCELLED && delivery.paymentStatus === PAYMENT_STATUS.PAID);
}

export function buildPaidPaymentBreakdown(deliveries = []) {
  const totals = { Pix: 0, Dinheiro: 0, "Cartão débito": 0, "Cartão crédito": 0 };
  getPaidActiveOrders(deliveries).forEach((delivery) => {
    if (delivery.payment === "Misto") {
      totals.Pix += Number(delivery.mixedPayment?.pix || 0);
      totals.Dinheiro += Number(delivery.mixedPayment?.cash || 0);
      totals["Cartão débito"] += Number(delivery.mixedPayment?.debit || 0);
      totals["Cartão crédito"] += Number(delivery.mixedPayment?.credit || 0);
      return;
    }
    if (totals[delivery.payment] !== undefined) totals[delivery.payment] += Number(delivery.value || 0);
  });
  return totals;
}

export function buildCashClosingReport(deliveries, cashSession = { openingAmount: 0, sangrias: [] }, orderPayments = []) {
  const openedAtTime = cashSession?.openedAt ? new Date(cashSession.openedAt).getTime() : 0;
  const orderTime = (delivery) => new Date(delivery.launchedAt || delivery.createdAt || delivery.deliveredAt || delivery.closedAt || 0).getTime() || 0;
  const hasCashSessionId = Boolean(cashSession?.id);
  const sessionOrders = (Array.isArray(deliveries) ? deliveries : []).filter((delivery) => {
    if (hasCashSessionId) return String(delivery.cashSessionId || "") === String(cashSession.id);
    return !openedAtTime || orderTime(delivery) >= openedAtTime;
  });
  const sessionPayments = (Array.isArray(orderPayments) ? orderPayments : []).filter((payment) => {
    if (!hasCashSessionId) return false;
    return String(payment.cashSessionId || "") === String(cashSession.id);
  });
  const cancelledOrders = sessionOrders.filter((delivery) => delivery.status === DELIVERY_STATUS.CANCELLED);
  const activeOrders = sessionOrders.filter((delivery) => delivery.status !== DELIVERY_STATUS.CANCELLED);
  const paidOrders = activeOrders.filter((delivery) => delivery.paymentStatus === PAYMENT_STATUS.PAID);
  const pendingOrders = activeOrders.filter((delivery) => delivery.paymentStatus !== PAYMENT_STATUS.PAID);
  const deliveryOrders = activeOrders.filter((delivery) => isDeliveryOrder(delivery));
  const counterOrders = activeOrders.filter((delivery) => isCounterOrder(delivery));
  const byPayment = { Pix: 0, Dinheiro: 0, "Cartão débito": 0, "Cartão crédito": 0 };
  const hasPaymentRows = sessionPayments.length > 0;
  if (hasPaymentRows) {
    sessionPayments
      .filter((payment) => String(payment.status || "paid") === "paid")
      .forEach((payment) => {
        const method = payment.method || "Outro";
        if (Object.prototype.hasOwnProperty.call(byPayment, method)) {
          byPayment[method] += toSafeMoneyNumber(payment.amount, 0);
        }
      });
  } else {
    paidOrders.forEach((delivery) => {
      if (delivery.payment === "Misto" && delivery.mixedPayment) {
        byPayment.Pix += toSafeMoneyNumber(delivery.mixedPayment.pix, 0);
        byPayment.Dinheiro += toSafeMoneyNumber(delivery.mixedPayment.cash, 0);
        byPayment["Cartão débito"] += toSafeMoneyNumber(delivery.mixedPayment.debit, 0);
        byPayment["Cartão crédito"] += toSafeMoneyNumber(delivery.mixedPayment.credit, 0);
        return;
      }
      if (Object.prototype.hasOwnProperty.call(byPayment, delivery.payment)) {
        byPayment[delivery.payment] += toSafeMoneyNumber(delivery.value, 0);
      }
    });
  }
  const paymentsReceivedTotal = hasPaymentRows
    ? sessionPayments.filter((payment) => String(payment.status || "paid") === "paid").reduce((sum, payment) => sum + toSafeMoneyNumber(payment.amount, 0), 0)
    : paidOrders.reduce((sum, delivery) => sum + toSafeMoneyNumber(delivery.value, 0), 0);
  const paymentsPendingTotal = hasPaymentRows
    ? sessionPayments.filter((payment) => String(payment.status || "") !== "paid").reduce((sum, payment) => sum + toSafeMoneyNumber(payment.amount, 0), 0)
    : pendingOrders.reduce((sum, delivery) => sum + toSafeMoneyNumber(delivery.value, 0), 0);
  const sangriaTotal = (cashSession.sangrias || []).reduce((sum, item) => sum + toSafeMoneyNumber(item.value, 0), 0);
  const openingAmount = toSafeMoneyNumber(cashSession.openingAmount, 0);
  const expectedDrawerCash = openingAmount + byPayment.Dinheiro - sangriaTotal;
  return {
    orders: sessionOrders,
    activeOrders,
    totalSold: activeOrders.reduce((sum, delivery) => sum + toSafeMoneyNumber(delivery.value, 0), 0),
    totalReceived: paymentsReceivedTotal,
    pendingAmount: paymentsPendingTotal,
    expectedCash: byPayment.Dinheiro,
    openingAmount,
    sangriaTotal,
    expectedDrawerCash,
    byPayment,
    deliverySold: deliveryOrders.reduce((sum, delivery) => sum + toSafeMoneyNumber(delivery.value, 0), 0),
    counterSold: counterOrders.reduce((sum, delivery) => sum + toSafeMoneyNumber(delivery.value, 0), 0),
    deliveryOrders: deliveryOrders.length,
    counterOrders: counterOrders.length,
    cancelledOrders: cancelledOrders.length,
    cancelledAmount: cancelledOrders.reduce((sum, delivery) => sum + toSafeMoneyNumber(delivery.value, 0), 0),
    pendingOrders: pendingOrders.length,
    paidOrders: paidOrders.length,
    openedAt: cashSession.openedAt || "",
    closedAt: cashSession.closedAt || "",
  };
}

export function getOrderDateMs(order) {
  return new Date(order?.launchedAt || order?.createdAt || order?.closedAt || order?.deliveredAt || 0).getTime() || 0;
}

export function isOrderInPeriod(order, startDate, endDate) {
  const time = getOrderDateMs(order);
  if (!time) return false;
  const start = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0;
  const end = endDate ? new Date(`${endDate}T23:59:59`).getTime() : Number.MAX_SAFE_INTEGER;
  return time >= start && time <= end;
}

export function buildPeriodSalesReport(deliveries, startDate, endDate, orderPayments = []) {
  const periodDeliveries = (Array.isArray(deliveries) ? deliveries : []).filter((delivery) => isOrderInPeriod(delivery, startDate, endDate));
  const activeOrders = periodDeliveries.filter((delivery) => delivery.status !== DELIVERY_STATUS.CANCELLED);
  const cancelledOrders = periodDeliveries.filter((delivery) => delivery.status === DELIVERY_STATUS.CANCELLED);
  const activeOrderIds = new Set(activeOrders.map((delivery) => String(delivery.id)));
  const byPayment = { Pix: 0, Dinheiro: 0, "Cartão débito": 0, "Cartão crédito": 0 };
  const matchingPayments = (Array.isArray(orderPayments) ? orderPayments : []).filter((payment) => activeOrderIds.has(String(payment.orderId)) && String(payment.status || "paid") === "paid");

  if (matchingPayments.length > 0) {
    matchingPayments.forEach((payment) => {
      if (Object.prototype.hasOwnProperty.call(byPayment, payment.method)) {
        byPayment[payment.method] += toSafeMoneyNumber(payment.amount, 0);
      }
    });
  } else {
    activeOrders.forEach((delivery) => {
      if (delivery.payment === "Misto" && delivery.mixedPayment) {
        byPayment.Pix += Number(delivery.mixedPayment.pix || 0);
        byPayment.Dinheiro += Number(delivery.mixedPayment.cash || 0);
        byPayment["Cartão débito"] += Number(delivery.mixedPayment.debit || 0);
        byPayment["Cartão crédito"] += Number(delivery.mixedPayment.credit || 0);
        return;
      }
      if (delivery.paymentStatus === PAYMENT_STATUS.PAID && Object.prototype.hasOwnProperty.call(byPayment, delivery.payment)) {
        byPayment[delivery.payment] += Number(delivery.value || 0);
      }
    });
  }

  const totalPaid = Object.values(byPayment).reduce((sum, value) => sum + toSafeMoneyNumber(value, 0), 0);
  const paidOrders = activeOrders.filter((delivery) => delivery.paymentStatus === PAYMENT_STATUS.PAID);
  const pendingOrders = activeOrders.filter((delivery) => delivery.paymentStatus !== PAYMENT_STATUS.PAID);
  const totalSold = activeOrders.reduce((sum, delivery) => sum + Number(delivery.value || 0), 0);
  return {
    orders: periodDeliveries,
    activeOrders,
    cancelledOrders,
    paidOrders,
    pendingOrders,
    totalOrders: activeOrders.length,
    totalSold,
    totalPaid,
    averageTicket: activeOrders.length ? totalSold / activeOrders.length : 0,
    pendingAmount: pendingOrders.reduce((sum, delivery) => sum + Number(delivery.value || 0), 0),
    byPayment,
    deliveryOrders: activeOrders.filter((delivery) => isDeliveryOrder(delivery)).length,
    counterOrders: activeOrders.filter((delivery) => isCounterOrder(delivery)).length,
  };
}

export function buildProductSalesReport(deliveries, startDate = "", endDate = "") {
  const periodDeliveries = (Array.isArray(deliveries) ? deliveries : []).filter((delivery) => {
    if (startDate || endDate) return isOrderInPeriod(delivery, startDate, endDate);
    return true;
  });
  const rowsByProduct = new Map();
  periodDeliveries
    .filter((delivery) => delivery.status !== DELIVERY_STATUS.CANCELLED)
    .forEach((delivery) => {
      (delivery.items || []).forEach((item) => {
        if (item.isKit && Array.isArray(item.kitItems)) {
          const key = `kit:${item.kitId || item.id}`;
          const current = rowsByProduct.get(key) || { key, name: item.name || "Kit", quantity: 0, total: 0, orders: new Set(), kind: "Kit" };
          current.quantity += toPositiveInteger(item.quantity, 1);
          current.total += toSafeMoneyNumber(item.price, 0) * toPositiveInteger(item.quantity, 1);
          current.orders.add(delivery.id);
          rowsByProduct.set(key, current);
          return;
        }
        const key = String(item.id || item.productId || item.barcode || item.name || "produto");
        const current = rowsByProduct.get(key) || { key, name: item.name || "Produto", quantity: 0, total: 0, orders: new Set(), kind: "Produto" };
        current.quantity += toPositiveInteger(item.quantity, 1);
        current.total += toSafeMoneyNumber(item.price, 0) * toPositiveInteger(item.quantity, 1);
        current.orders.add(delivery.id);
        rowsByProduct.set(key, current);
      });
    });

  return Array.from(rowsByProduct.values())
    .map((row) => ({ ...row, orders: row.orders.size, averageTicket: row.orders.size ? row.total / row.orders.size : 0 }))
    .sort((a, b) => b.total - a.total);
}

export function buildCategorySalesReport(deliveries, products = [], startDate = "", endDate = "") {
  const categoryByProduct = new Map(products.map((product) => [String(product.id), product.category || "Sem categoria"]));
  const productRows = buildProductSalesReport(deliveries, startDate, endDate);
  const rowsByCategory = new Map();
  productRows.forEach((row) => {
    const category = row.kind === "Kit" ? "Kits" : (categoryByProduct.get(String(row.key)) || "Sem categoria");
    const current = rowsByCategory.get(category) || { category, quantity: 0, total: 0, products: 0 };
    current.quantity += row.quantity;
    current.total += row.total;
    current.products += 1;
    rowsByCategory.set(category, current);
  });
  return Array.from(rowsByCategory.values()).sort((a, b) => b.total - a.total);
}

export function buildPrintableRowsHtml(rows, columns) {
  if (!Array.isArray(rows) || rows.length === 0) return `<tr><td colspan="${columns.length}">Sem registros no período.</td></tr>`;
  return rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(column.render ? column.render(row) : row[column.key])}</td>`).join("")}</tr>`).join("");
}

export function buildStoreDeliveryFinancialSummary(deliveries) {
  const confirmed = deliveries.filter((delivery) => isDeliveryOrder(delivery) && delivery.status === DELIVERY_STATUS.CONFIRMED_DELIVERED && delivery.ownerApproved === true);
  return {
    deliveryCount: confirmed.length,
    totalDeliveryFees: confirmed.reduce((sum, delivery) => sum + normalizeDeliveryFee(delivery.deliveryFee), 0),
    courierAmount: confirmed.reduce((sum, delivery) => sum + Number(delivery.courierFee ?? calculateCourierFee(delivery.deliveryFee, delivery.motorcycleType)), 0),
    storeAmount: confirmed.reduce((sum, delivery) => sum + Number(delivery.storeFee ?? calculateStoreFee(delivery.deliveryFee, delivery.motorcycleType)), 0),
  };
}

