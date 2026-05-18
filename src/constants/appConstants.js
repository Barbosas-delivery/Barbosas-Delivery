export const APP_VERSION = "6.0.55-fase-67-testes-funcionais-completos";

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

export const PRODUCTION_READINESS_CHECKLIST = [
  { id: "supabase", label: "Supabase configurado", description: "URL, chave anônima e migrações finais aplicadas." },
  { id: "order_flow", label: "Pedido completo testado", description: "Cliente monta lanche, escolhe adicionais, remove ingredientes, envia pedido e a loja recebe." },
  { id: "print_flow", label: "Impressão validada", description: "Cozinha, entrega e balcão imprimem em 80mm com personalização do lanche." },
  { id: "stock_flow", label: "Estoque protegido", description: "Baixa atômica ativa e sem permitir saldo negativo na venda." },
  { id: "vercel", label: "Deploy Vercel conferido", description: "Build web aprovado, service worker sem cache antigo e variáveis configuradas." },
  { id: "desktop", label: "Desktop de impressão pronto", description: "Electron abre, lista impressoras, consome fila e permite reprocessar falhas." },
  { id: "backup", label: "Rotina de backup definida", description: "Loja sabe baixar diagnóstico, backup diário e checklist antes de operar." },
];


export const FUNCTIONAL_VALIDATION_CHECKLIST = [
  { id: "category", label: "Categoria de teste criada", description: "Categoria TESTE FASE 67 - Lanches existe e recebe produtos." },
  { id: "addon", label: "Adicional por categoria validado", description: "Adicional TESTE FASE 67 - Bacon extra aparece para todos os lanches da categoria." },
  { id: "product", label: "Produto/lanche validado", description: "Lanche de teste cadastrado sem estoque obrigatório e com observação por item." },
  { id: "combo", label: "Combo validado", description: "Combo teste cadastrado no lugar de kit e com itens vinculados." },
  { id: "customer_order", label: "Pedido do cliente validado", description: "Carrinho aceita lanche, adicional, escolha de combo e observação." },
  { id: "counter_sale", label: "PDV Balcão validado", description: "Venda normal do balcão monta itens e totais corretamente." },
  { id: "tab_create", label: "Comanda criada pelo PDV", description: "Comanda de 1 a 100 exige mesa e nome completo do responsável." },
  { id: "tab_add_items", label: "Adição em comanda validada", description: "Novos itens entram em comanda aberta e geram impressão separada." },
  { id: "tab_print", label: "Impressão da comanda validada", description: "Adição, consumo completo e fechamento têm dados suficientes para cozinha/caixa." },
  { id: "tab_close", label: "Fechamento da comanda validado", description: "Comanda vira venda normal paga e deixa de ser fiado." },
  { id: "stock", label: "Estoque validado", description: "Lanches não baixam estoque; bebidas e produtos controlados continuam baixando." },
  { id: "cleanup", label: "Limpeza dos dados de teste validada", description: "Dados TESTE FASE 67 podem ser apagados sem afetar produtos reais." },
];
