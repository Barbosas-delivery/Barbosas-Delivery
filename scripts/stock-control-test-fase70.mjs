import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const stockSource = fs.readFileSync(path.join(root, "src", "utils", "stock.js"), "utf8");
const appSource = fs.readFileSync(path.join(root, "src", "App.jsx"), "utf8");
const ordersSource = fs.readFileSync(path.join(root, "src", "services", "supabaseOrders.js"), "utf8");
const migrationSource = fs.readFileSync(path.join(root, "supabase", "migracao-final-producao-6-0-58.sql"), "utf8");

assert.match(stockSource, /export function expandStockControlledItems/);
assert.match(stockSource, /filter\(\(item\) => isStockControlledProduct\(item\)\)/);
assert.match(appSource, /expandStockControlledItems\(items \|\| \[\]\)/);
assert.match(ordersSource, /expandStockControlledItems\(items\)/);
assert.match(migrationSource, /stock_control_disabled/);
assert.match(migrationSource, /coalesce\(p\.stock_controlled, true\) = false/);

console.log("Fase 70 OK: estoque baixa apenas produtos com controle ativo.");
