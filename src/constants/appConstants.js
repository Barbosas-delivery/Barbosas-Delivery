export const APP_VERSION = "6.0.49-fase-61-personalizacao-lanches";

export const DELIVERY_FEE = 5;
export const ESTIMATED_DELIVERY_MINUTES_PER_ORDER = 7;
export const COURIER_DELIVERY_SHARE = 0.7;
export const STORE_DELIVERY_SHARE = 0.3;

export const DELIVERY_STATUS = {
  WAITING_STORE_APPROVAL: "Aguardando aprovação do pedido", // legado: pedidos novos entram direto como Aguardando retirada
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
  "Fora da área de entrega",
  "Pagamento não aprovado",
  "Pedido duplicado",
  "Problema operacional da loja",
  "Outro motivo",
];

export const DELIVERY_PROBLEM_REASONS = [
  "Cliente não atende",
  "Endereço errado",
  "Cliente ausente",
  "Problema com pagamento",
  "Moto com problema",
  "Pedido avariado",
  "Região insegura",
  "Outro motivo",
];

export const ORDER_TYPE = {
  DELIVERY: "delivery",
  COUNTER: "counter",
};

export const PRINT_JOB_STATUS = {
  PENDING: "pending",
  PRINTING: "printing",
  PRINTED: "printed",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

export const PRINT_JOB_TYPE = {
  KITCHEN: "kitchen",
  DELIVERY: "delivery",
  COUNTER: "counter",
};

export const PRINT_JOB_SOURCE = {
  CUSTOMER_APP: "customer_app",
  PDV_DELIVERY: "pdv_entregas",
  PDV_COUNTER: "pdv_balcao",
};

export const DEFAULT_TAB_CREDIT_LIMIT = 50;
export const TAB_FAST_PAYMENT_BONUS = 10;
export const TAB_DELAY_PENALTY = 10;
export const TAB_DELAY_LIMIT_HOURS = 24;

export const STORAGE_PREFIX = "barbosas_delivery_v3_";
export const STORAGE_24_MONTHS_MS = 1000 * 60 * 60 * 24 * 730;
