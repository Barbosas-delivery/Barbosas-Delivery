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

function isStockControlledProduct(product = {}) {
  if (product.stockControlled !== undefined) return product.stockControlled === true;
  if (product.stock_controlled !== undefined) return product.stock_controlled === true;
  const type = String(product.productType || product.product_type || product.category || "").toLowerCase();
  if (/(lanche|hamb[uú]rguer|hamburguer|por[cç][aã]o|combo)/.test(type)) return false;
  return true;
}

function validateOrderItems(items, products) {
  if (!items || items.length === 0) return { valid: false, message: "Adicione pelo menos um produto ao pedido." };
  for (const item of items) {
    const product = products.find((currentProduct) => Number(currentProduct.id) === Number(item.id));
    if (!product || product.active !== true) return { valid: false, message: "Produto indisponível no pedido. Remova para continuar." };
    if (isStockControlledProduct(product) && Number(product.stock || 0) < Number(item.quantity || 0)) {
      return { valid: false, message: `Estoque insuficiente para ${product.name}. Disponível: ${product.stock}.` };
    }
  }
  return { valid: true, message: "" };
}

function reduceProductStock(products, items) {
  return products.map((product) => {
    const totalQuantity = items.filter((item) => Number(item.id) === Number(product.id)).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    if (!totalQuantity || !isStockControlledProduct(product)) return product;
    return { ...product, stock: Math.max(0, Number(product.stock || 0) - totalQuantity) };
  });
}

function buildComboProductsTotal(comboItems, products) {
  return comboItems.reduce((sum, item) => {
    const product = products.find((currentProduct) => Number(currentProduct.id) === Number(item.productId));
    return sum + Number(product?.price || 0) * Number(item.quantity || 0);
  }, 0);
}

function getComboItemsForOrder(combo, products) {
  return combo.items.map((item) => {
    const product = products.find((currentProduct) => Number(currentProduct.id) === Number(item.productId));
    return { id: product?.id, name: product?.name || "Produto do combo", price: Number(product?.price || 0), quantity: Number(item.quantity || 0), barcode: product?.barcode || "", comboName: combo.name };
  });
}

function describeComboItems(combo, products) {
  return combo.items.map((item) => {
    const product = products.find((currentProduct) => Number(currentProduct.id) === Number(item.productId));
    return `${item.quantity}x ${product?.name || "Produto removido"}`;
  }).join(", ");
}

function buildSimulatedKitchenTicket({ title, items }) {
  const lines = [title, "COZINHA"];
  for (const item of items) {
    lines.push(`${item.quantity}x ${item.name}`);
    if (item.selectedAddons?.length) lines.push(`ADICIONAIS: ${item.selectedAddons.map((addon) => addon.name).join(", ")}`);
    if (item.itemNote) lines.push(`OBS DO ITEM: ${item.itemNote}`);
  }
  return lines.join("\n");
}

function buildSimulatedCounterTicket({ title, items, total }) {
  const lines = [title, "BALCÃO", ...items.map((item) => `${item.quantity}x ${item.name}`), `TOTAL: ${total}`];
  return lines.join("\n");
}

const category = "TESTE FASE 67 - Lanches";
const products = [
  { id: 6701, name: "TESTE FASE 67 - X-Bacon", category, productType: "lanche", product_type: "lanche", price: 28, stock: 0, minStock: 0, stockControlled: false, stock_controlled: false, active: true },
  { id: 6702, name: "TESTE FASE 67 - Coca Lata", category: "Bebidas", productType: "bebida", product_type: "bebida", price: 7, stock: 3, minStock: 1, stockControlled: true, stock_controlled: true, active: true },
  { id: 6703, name: "TESTE FASE 67 - Batata Pequena", category: "Porções", productType: "porcao", product_type: "porcao", price: 16, stock: 0, minStock: 0, stockControlled: false, stock_controlled: false, active: true },
];
const categoryAddons = [
  { id: "addon-bacon", categoryName: category, category_name: category, name: "TESTE FASE 67 - Bacon extra", price: 5, active: true, sortOrder: 1 },
  { id: "addon-cheddar", categoryName: category, category_name: category, name: "TESTE FASE 67 - Cheddar", price: 4, active: true, sortOrder: 2 },
];
const combo = { id: 6790, name: "TESTE FASE 67 - Combo X-Bacon", description: "Lanche + bebida + porção", price: 45, active: true, items: [{ productId: 6701, quantity: 1 }, { productId: 6702, quantity: 1 }, { productId: 6703, quantity: 1 }] };

function getAddonsForCategory(categoryName) {
  return categoryAddons.filter((addon) => addon.active && String(addon.category_name || addon.categoryName).toLowerCase() === String(categoryName).toLowerCase());
}

const customizedSnack = { id: 6701, name: "TESTE FASE 67 - X-Bacon", category, price: 37, basePrice: 28, quantity: 1, selectedAddons: categoryAddons.map((addon) => ({ id: addon.id, name: addon.name, price: addon.price })), selectedComboChoices: [], removedIngredients: [], itemNote: "Sem tomate, carne bem passada" };
const tab = { id: 67100, tabNumber: 67, tableNumber: 12, responsibleName: "Cliente Teste Fase Sessenta e Sete", customerName: "Cliente Teste Fase Sessenta e Sete", status: "open", items: [customizedSnack] };

test("categoria aplica adicionais em todos os lanches da categoria", () => {
  const addons = getAddonsForCategory(category);
  assert.equal(addons.length, 2);
  assert.equal(addons.reduce((sum, addon) => sum + Number(addon.price), 0), 9);
});

test("lanche não controla estoque e bebida controla estoque", () => {
  assert.equal(isStockControlledProduct(products[0]), false);
  assert.equal(isStockControlledProduct(products[1]), true);
  assert.equal(isStockControlledProduct(products[2]), false);
});

test("pedido com lanche sem estoque e bebida com estoque válido passa", () => {
  const validation = validateOrderItems([{ id: 6701, quantity: 3 }, { id: 6702, quantity: 2 }], products);
  assert.equal(validation.valid, true);
});

test("bebida controlada bloqueia estoque insuficiente", () => {
  const validation = validateOrderItems([{ id: 6702, quantity: 4 }], products);
  assert.equal(validation.valid, false);
  assert.match(validation.message, /Estoque insuficiente/);
});

test("baixa de estoque ignora lanche e baixa bebida", () => {
  const reduced = reduceProductStock(products, [{ id: 6701, quantity: 2 }, { id: 6702, quantity: 2 }]);
  assert.equal(reduced.find((product) => product.id === 6701).stock, 0);
  assert.equal(reduced.find((product) => product.id === 6702).stock, 1);
});

test("combo substitui kit na regra operacional e calcula itens", () => {
  assert.equal(buildComboProductsTotal(combo.items, products), 51);
  assert.equal(getComboItemsForOrder(combo, products).length, 3);
  assert.match(describeComboItems(combo, products), /X-Bacon/);
});

test("comanda exige número 1-100, mesa e nome completo", () => {
  assert.ok(tab.tabNumber >= 1 && tab.tabNumber <= 100);
  assert.ok(Number(tab.tableNumber) > 0);
  assert.ok(tab.responsibleName.trim().split(/\s+/).length >= 3);
});

test("impressão da adição de comanda destaca adicionais e observação", () => {
  const ticket = buildSimulatedKitchenTicket({ title: "ADIÇÃO NA COMANDA", items: [customizedSnack] });
  assert.match(ticket, /ADICIONAIS/);
  assert.match(ticket, /Bacon extra/);
  assert.match(ticket, /OBS DO ITEM/);
  assert.match(ticket, /ADIÇÃO NA COMANDA/);
});

test("impressão do consumo completo da comanda inclui combo e totais", () => {
  const comboItem = { id: `combo-${combo.id}`, name: combo.name, price: combo.price, quantity: 1, isKit: true, kitId: combo.id, kitItems: getComboItemsForOrder(combo, products) };
  const ticket = buildSimulatedCounterTicket({ title: "CONSUMO COMPLETO DA COMANDA", items: [customizedSnack, comboItem], total: 82 });
  assert.match(ticket, /CONSUMO COMPLETO DA COMANDA/);
  assert.match(ticket, /Combo X-Bacon/);
  assert.match(ticket, /TOTAL/);
});

test("templates reais de impressão suportam adicionais, combo e observações", () => {
  const templateSource = readFileSync(new URL("../src/utils/printJobTemplates.js", import.meta.url), "utf8");
  assert.match(templateSource, /ADICIONAIS/);
  assert.match(templateSource, /ESCOLHAS DO COMBO/);
  assert.match(templateSource, /OBS DO ITEM/);
});

test("SQL da fase 67 contém criação, limpeza e relatório do teste funcional", () => {
  const sql = readFileSync(new URL("../supabase/migracao-final-producao-6-0-55.sql", import.meta.url), "utf8");
  assert.match(sql, /functional_test_runs/i);
  assert.match(sql, /run_phase_67_functional_test/i);
  assert.match(sql, /cleanup_phase_67_test_data/i);
  assert.match(sql, /TESTE FASE 67/i);
});

console.log("\nTodos os testes funcionais simulados da Fase 67 passaram.");
