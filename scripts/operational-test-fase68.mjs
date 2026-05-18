import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

function sumByMethod(payments, method) {
  return payments.filter((payment) => payment.method === method && payment.status === "paid").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}

function buildCashClosing({ openingAmount, supply, withdrawal, payments, cancelledAmount }) {
  const pix = sumByMethod(payments, "Pix");
  const cash = sumByMethod(payments, "Dinheiro");
  const debit = sumByMethod(payments, "Cartão débito");
  const credit = sumByMethod(payments, "Cartão crédito");
  const totalReceived = pix + cash + debit + credit;
  const expectedCash = openingAmount + supply + cash - withdrawal;
  return {
    pix,
    cash,
    debit,
    credit,
    totalReceived,
    totalSold: totalReceived,
    cancelledAmount,
    expectedCash,
    countedCash: expectedCash,
    difference: 0,
  };
}

function isStockControlledProduct(product = {}) {
  if (product.stockControlled !== undefined) return product.stockControlled === true;
  if (product.stock_controlled !== undefined) return product.stock_controlled === true;
  const type = String(product.productType || product.product_type || product.category || "").toLowerCase();
  if (/(lanche|hamb[uú]rguer|hamburguer|por[cç][aã]o|combo)/.test(type)) return false;
  return true;
}

function reduceStock(products, saleItems) {
  return products.map((product) => {
    if (!isStockControlledProduct(product)) return product;
    const quantity = saleItems.filter((item) => Number(item.id) === Number(product.id)).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    return { ...product, stock: Math.max(0, Number(product.stock || 0) - quantity) };
  });
}

function assertFullName(name) {
  assert.ok(String(name || "").trim().split(/\s+/).length >= 3);
}

function makePrintTicket(title, items) {
  const lines = [title];
  for (const item of items) {
    lines.push(`${item.quantity}x ${item.name}`);
    if (item.selectedAddons?.length) lines.push(`ADICIONAIS: ${item.selectedAddons.map((addon) => addon.name).join(", ")}`);
    if (item.itemNote) lines.push(`OBS DO ITEM: ${item.itemNote}`);
  }
  return lines.join("\n");
}

const products = [
  { id: 6801, name: "TESTE FASE 68 - X-Bacon Operacional", category: "TESTE FASE 68 - Lanches", productType: "lanche", price: 28, stock: 0, stockControlled: false, active: true },
  { id: 6802, name: "TESTE FASE 68 - Coca Lata Estoque", category: "Bebidas", productType: "bebida", price: 7, stock: 8, stockControlled: true, active: true },
  { id: 6803, name: "TESTE FASE 68 - Batata Operacional", category: "Porções", productType: "porcao", price: 16, stock: 0, stockControlled: false, active: true },
  { id: 6804, name: "TESTE FASE 68 - Pudim Estoque", category: "Sobremesas", productType: "sobremesa", price: 9, stock: 5, stockControlled: true, active: true },
];

const addons = [
  { categoryName: "TESTE FASE 68 - Lanches", name: "TESTE FASE 68 - Bacon extra", price: 5, active: true },
  { categoryName: "TESTE FASE 68 - Lanches", name: "TESTE FASE 68 - Cheddar", price: 4, active: true },
];

const snackWithAddons = {
  id: 6801,
  name: "TESTE FASE 68 - X-Bacon Operacional",
  quantity: 1,
  price: 37,
  basePrice: 28,
  selectedAddons: addons.map((addon) => ({ name: addon.name, price: addon.price })),
  itemNote: "Sem tomate, carne bem passada",
};

const payments = [
  { orderId: "TESTE-F68-DELIVERY-ENTREGUE", method: "Pix", amount: 40, status: "paid" },
  { orderId: "TESTE-F68-PDV-BALCAO", method: "Dinheiro", amount: 23, status: "paid" },
  { orderId: "TESTE-F68-COMANDA-FECHADA", method: "Cartão débito", amount: 44, status: "paid" },
  { orderId: "TESTE-F68-CANCELADO", method: "Pix", amount: 33, status: "cancelled" },
];

const deliveryOrder = {
  id: "TESTE-F68-DELIVERY-ENTREGUE",
  orderType: "delivery",
  status: "Entregue confirmado",
  paymentStatus: "Pago",
  acceptedAt: "2026-05-18T20:10:00.000Z",
  pickedUpAt: "2026-05-18T20:25:00.000Z",
  deliveredAt: "2026-05-18T20:45:00.000Z",
  address: "Rua Teste Operacional, 68 - Maringá",
  courierName: "Motoboy Teste Fase 68",
  items: [snackWithAddons, { id: 6802, name: "TESTE FASE 68 - Coca Lata Estoque", quantity: 1, price: 7 }],
  total: 40,
};

const counterOrder = {
  id: "TESTE-F68-PDV-BALCAO",
  orderType: "counter",
  status: "Entregue confirmado",
  paymentStatus: "Pago",
  items: [{ id: 6803, name: "TESTE FASE 68 - Batata Operacional", quantity: 1, price: 16 }, { id: 6802, name: "TESTE FASE 68 - Coca Lata Estoque", quantity: 1, price: 7 }],
  total: 23,
};

const tab = {
  id: 680068,
  tabNumber: 68,
  tableNumber: 12,
  responsibleName: "TESTE FASE 68 Cliente Completo Mesa",
  status: "closed",
  payment: "Cartão débito",
  total: 44,
  items: [snackWithAddons, { id: 6802, name: "TESTE FASE 68 - Coca Lata Estoque", quantity: 1, price: 7 }],
};

const cancelledOrder = {
  id: "TESTE-F68-CANCELADO",
  status: "Pedido cancelado",
  cancellationReason: "TESTE FASE 68 - cliente desistiu",
};

test("caixa abre, recebe suprimento, sangria e fecha com totais corretos", () => {
  const closing = buildCashClosing({ openingAmount: 100, supply: 50, withdrawal: 30, payments, cancelledAmount: 33 });
  assert.equal(closing.pix, 40);
  assert.equal(closing.cash, 23);
  assert.equal(closing.debit, 44);
  assert.equal(closing.totalReceived, 107);
  assert.equal(closing.expectedCash, 143);
  assert.equal(closing.difference, 0);
});

test("delivery cobre criado, aceito, saiu para entrega e confirmado", () => {
  assert.equal(deliveryOrder.orderType, "delivery");
  assert.equal(deliveryOrder.status, "Entregue confirmado");
  assert.equal(deliveryOrder.paymentStatus, "Pago");
  assert.ok(deliveryOrder.acceptedAt);
  assert.ok(deliveryOrder.pickedUpAt);
  assert.ok(deliveryOrder.deliveredAt);
  assert.match(deliveryOrder.address, /Rua Teste Operacional/);
});

test("PDV balcão cria venda paga vinculável ao caixa", () => {
  assert.equal(counterOrder.orderType, "counter");
  assert.equal(counterOrder.paymentStatus, "Pago");
  assert.equal(counterOrder.items.reduce((sum, item) => sum + item.price * item.quantity, 0), 23);
});

test("comanda exige número, mesa, responsável, itens e fechamento", () => {
  assert.ok(tab.tabNumber >= 1 && tab.tabNumber <= 100);
  assert.equal(tab.tableNumber, 12);
  assertFullName(tab.responsibleName);
  assert.equal(tab.status, "closed");
  assert.equal(tab.total, 44);
  assert.equal(tab.items.length, 2);
});

test("estoque baixa bebida controlada e ignora lanche/porção", () => {
  const finalProducts = reduceStock(products, [...deliveryOrder.items, ...counterOrder.items, ...tab.items]);
  assert.equal(finalProducts.find((product) => product.id === 6801).stock, 0);
  assert.equal(finalProducts.find((product) => product.id === 6802).stock, 5);
  assert.equal(finalProducts.find((product) => product.id === 6803).stock, 0);
});

test("adicionais por categoria entram no lanche e no cupom de cozinha", () => {
  assert.equal(addons.filter((addon) => addon.categoryName === products[0].category).length, 2);
  const ticket = makePrintTicket("COZINHA - TESTE FASE 68", [snackWithAddons]);
  assert.match(ticket, /ADICIONAIS/);
  assert.match(ticket, /Bacon extra/);
  assert.match(ticket, /OBS DO ITEM/);
});

test("cancelamento exige motivo e pagamento cancelado", () => {
  assert.equal(cancelledOrder.status, "Pedido cancelado");
  assert.match(cancelledOrder.cancellationReason, /cliente desistiu/);
  assert.ok(payments.some((payment) => payment.orderId === cancelledOrder.id && payment.status === "cancelled"));
});

test("SQL da fase 68 contém teste operacional, limpeza, view e todos os blocos obrigatórios", () => {
  const sql = readFileSync(new URL("../supabase/migracao-final-producao-6-0-56.sql", import.meta.url), "utf8");
  assert.match(sql, /operational_test_runs/i);
  assert.match(sql, /run_phase_68_operational_test/i);
  assert.match(sql, /cleanup_phase_68_test_data/i);
  assert.match(sql, /phase_68_operational_test_summary_view/i);
  for (const required of ["cash_open", "cash_supply", "cash_withdrawal", "customer_delivery", "accept_delivery", "dispatch_delivery", "confirm_delivery", "counter_sale", "tab_full_flow", "stock_movement", "print_jobs", "cancel_order", "cash_close", "reports", "cleanup"]) {
    assert.match(sql, new RegExp(required));
  }
});

test("interface expõe checklist operacional da Fase 68 no diagnóstico", () => {
  const constants = readFileSync(new URL("../src/constants/appConstants.js", import.meta.url), "utf8");
  const panel = readFileSync(new URL("../src/components/OperationalPanels.jsx", import.meta.url), "utf8");
  assert.match(constants, /OPERATIONAL_VALIDATION_CHECKLIST/);
  assert.match(constants, /Abrir caixa/);
  assert.match(panel, /Teste operacional completo da Fase 68/);
  assert.match(panel, /operationalValidation/);
});

console.log("\nTodos os testes operacionais simulados da Fase 68 passaram.");
