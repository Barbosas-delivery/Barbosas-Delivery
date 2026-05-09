export const APP_VERSION = "6.0.1-final";

export const DELIVERY_FEE = 5;
export const ESTIMATED_DELIVERY_MINUTES_PER_ORDER = 7;
export const COURIER_DELIVERY_SHARE = 0.7;
export const STORE_DELIVERY_SHARE = 0.3;

export const DELIVERY_STATUS = {
  WAITING_STORE_APPROVAL: "Aguardando aprovação do pedido",
  WAITING_PICKUP: "Aguardando retirada",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  WAITING_OWNER_APPROVAL: "Aguardando aprovação da loja",
  CONFIRMED_DELIVERED: "Entregue confirmado",
  DELIVERY_PROBLEM: "Problema na entrega",
  CANCELLED: "Pedido cancelado",
};

export const PAYMENT_STATUS = {
  PENDING: "Pagamento pendente",
  PAID: "Pago",
  RECEIVABLE: "Falta receber",
  STORE_CREDIT: "Fiado/anotado",
};

export const CANCELLATION_REASONS = [
  "Cliente desistiu",
  "Produto indisponível",
  "Endereço incorreto",
  "Pedido duplicado",
  "Outro motivo",
];

export const ORDER_TYPE = {
  DELIVERY: "delivery",
  COUNTER: "counter",
};

export const DEFAULT_TAB_CREDIT_LIMIT = 50;
export const TAB_FAST_PAYMENT_BONUS = 10;
export const TAB_DELAY_PENALTY = 10;
export const TAB_DELAY_LIMIT_HOURS = 24;

export const STORAGE_PREFIX = "barbosas_delivery_v3_";
export const STORAGE_24_MONTHS_MS = 1000 * 60 * 60 * 24 * 730;
