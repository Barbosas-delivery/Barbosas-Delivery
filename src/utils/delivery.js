import {
  DELIVERY_STATUS,
  ORDER_TYPE,
  DELIVERY_FEE,
  COURIER_DELIVERY_SHARE,
  STORE_DELIVERY_SHARE,
} from "../constants/appConstants";
import { getPaymentLabel } from "./payments";

export function isDeliveryOrder(order) {
  if (!order) return false;
  return !order.orderType || order.orderType === ORDER_TYPE.DELIVERY;
}

export function isCounterOrder(order) {
  if (!order) return false;
  return order.orderType === ORDER_TYPE.COUNTER;
}

export function needsStoreApprovalBeforeCourier(order) {
  if (!isDeliveryOrder(order)) return false;

  // A única situação que deve bloquear o painel do entregador é o pedido ainda
  // estar explicitamente aguardando aprovação da loja. Depois que a loja muda
  // o status para "Aguardando retirada", o pedido precisa aparecer para os
  // entregadores mesmo se colunas antigas como store_order_approved não existirem
  // ou não tiverem sido gravadas no Supabase.
  if (order.status === DELIVERY_STATUS.WAITING_STORE_APPROVAL) return true;

  const releasedStatuses = [
    DELIVERY_STATUS.WAITING_PICKUP,
    DELIVERY_STATUS.OUT_FOR_DELIVERY,
    DELIVERY_STATUS.WAITING_OWNER_APPROVAL,
    DELIVERY_STATUS.DELIVERY_PROBLEM,
    DELIVERY_STATUS.CONFIRMED_DELIVERED,
  ];

  if (releasedStatuses.includes(order.status)) return false;

  if (order.needsStoreApproval === true && order.storeOrderApproved !== true) return true;
  if (order.origin === "customer" && order.storeOrderApproved !== true && !order.approvedAt) return true;
  if (String(order.notes || "").toLowerCase().includes("pedido enviado pelo cliente") && order.storeOrderApproved !== true && !order.approvedAt) return true;
  return false;
}

export function canCourierControlDelivery(delivery, courierUsername) {
  if (!isDeliveryOrder(delivery) || delivery.status === DELIVERY_STATUS.CANCELLED) return false;
  if (!delivery.pickedUpByUsername) return true;
  return String(delivery.pickedUpByUsername).toLowerCase() === String(courierUsername || "").toLowerCase();
}

export function normalizeDeliveryFee(value) {
  if (value === "" || value === null || value === undefined) return DELIVERY_FEE;
  return Math.max(0, Number(value || 0));
}

export function buildDeliveryTotal(productsTotal, deliveryFee = DELIVERY_FEE, discount = 0) {
  const finalDeliveryFee = normalizeDeliveryFee(deliveryFee);
  return Math.max(0, Number(productsTotal || 0) + finalDeliveryFee - Number(discount || 0));
}

export function buildDiscountedProductsTotal(productsTotal, discount = 0) {
  return Math.max(0, Number(productsTotal || 0) - Number(discount || 0));
}

export function normalizeDiscount(discount = 0, baseTotal = 0) {
  return Math.min(Math.max(0, Number(discount || 0)), Math.max(0, Number(baseTotal || 0)));
}

export function isStoreMotorcycle(motorcycleType) {
  return String(motorcycleType || "").toLowerCase() === "moto do estabelecimento";
}

export function calculateCourierFee(deliveryFee = DELIVERY_FEE, motorcycleType = "Moto do estabelecimento") {
  const finalFee = normalizeDeliveryFee(deliveryFee);
  return isStoreMotorcycle(motorcycleType) ? finalFee * COURIER_DELIVERY_SHARE : finalFee;
}

export function calculateStoreFee(deliveryFee = DELIVERY_FEE, motorcycleType = "Moto do estabelecimento") {
  const finalFee = normalizeDeliveryFee(deliveryFee);
  return isStoreMotorcycle(motorcycleType) ? finalFee * STORE_DELIVERY_SHARE : 0;
}

export function getCourierMotorcycleType(couriers, courierUsername) {
  const normalizedUsername = String(courierUsername || "").trim().toLowerCase();
  const courier = couriers.find((item) => item.username.toLowerCase() === normalizedUsername);
  return courier?.motorcycleType || "Moto própria";
}

export function buildDeliveryAddress(client) {
  if (!client) return "";
  return `${client.street}, ${client.number} - ${client.district}, ${client.city}/${client.state}`;
}

export function getCourierDeliveries(deliveries) {
  const deliveryList = Array.isArray(deliveries) ? deliveries : [];
  return deliveryList.filter((delivery) =>
    isDeliveryOrder(delivery) &&
    delivery.status !== DELIVERY_STATUS.CANCELLED &&
    delivery.status !== DELIVERY_STATUS.CONFIRMED_DELIVERED &&
    !needsStoreApprovalBeforeCourier(delivery)
  );
}

export function getStatusClass(status) {
  if (status === DELIVERY_STATUS.CONFIRMED_DELIVERED) return "bg-emerald-100 text-emerald-700";
  if (status === DELIVERY_STATUS.WAITING_STORE_APPROVAL) return "bg-purple-100 text-purple-700";
  if (status === DELIVERY_STATUS.WAITING_OWNER_APPROVAL) return "bg-blue-100 text-blue-700";
  if (status === DELIVERY_STATUS.DELIVERY_PROBLEM || status === DELIVERY_STATUS.CANCELLED) return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

export function getOrderLabel(order, capitalize = false) {
  const label = isCounterOrder(order) ? "venda" : "pedido";
  return capitalize ? label.charAt(0).toUpperCase() + label.slice(1) : label;
}

export function buildOrderConfirmation(delivery) {
  return {
    id: delivery.id,
    total: delivery.value,
    payment: getPaymentLabel(delivery.payment, delivery.changeFor),
  };
}

