import { supabase } from "../supabaseClient";
import { DEFAULT_TAB_CREDIT_LIMIT } from "../constants/appConstants";
import { insertWithSchemaRetry, updateWithSchemaRetry } from "./supabaseSchema";

export function parseJsonNotes(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function mapTabItemFromDatabase(item) {
  return {
    id: item.product_id ?? item.id,
    name: item.name || "Produto",
    quantity: Number(item.quantity || 1),
    price: Number(item.price || 0),
    barcode: item.barcode || "",
  };
}

export function groupTabItemsByTab(itemRows = []) {
  return (Array.isArray(itemRows) ? itemRows : []).reduce((acc, item) => {
    const key = item.tab_account_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(mapTabItemFromDatabase(item));
    return acc;
  }, {});
}

export function mapTabAccountFromDatabase(row, itemsByTab = {}, options = {}) {
  const defaultCreditLimit = options.defaultCreditLimit ?? DEFAULT_TAB_CREDIT_LIMIT;
  return {
    id: row.id,
    customerName: row.customer_name || row.customerName || "Cliente",
    phone: row.phone || "",
    creditLimit: Number(row.credit_limit ?? row.creditLimit ?? defaultCreditLimit),
    payment: row.payment || "Dinheiro",
    items: itemsByTab[row.id] || parseJsonNotes(row.items_json || row.items || "", parseJsonNotes(row.notes, {}).items || []),
    openedAt: row.opened_at || row.openedAt || row.created_at || new Date().toISOString(),
    cashSessionId: row.cash_session_id || "",
    notes: row.notes || "Comanda aberta",
  };
}

export async function loadTabsAccountsFromSupabase(options = {}) {
  const { data, error } = await supabase.from("tab_accounts").select("*");
  if (error) return { tabs: [], error };

  const { data: itemRows, error: itemError } = await supabase.from("tab_account_items").select("*");
  if (itemError) console.warn("Itens de comandas não carregados; usando fallback JSON:", itemError);

  const itemsByTab = groupTabItemsByTab(itemRows || []);
  const tabs = (Array.isArray(data) ? data : [])
    .filter((row) => String(row.status || "open") === "open")
    .map((row) => mapTabAccountFromDatabase(row, itemsByTab, options));

  return { tabs, error: null };
}

export function buildTabAccountPayload(tab, status = "open", options = {}) {
  const defaultCreditLimit = options.defaultCreditLimit ?? DEFAULT_TAB_CREDIT_LIMIT;
  const closedBy = options.closedBy || null;
  const cashSessionId = options.cashSessionId ?? tab.cashSessionId ?? null;
  const total = Number(options.total ?? 0);

  return {
    id: tab.id,
    customer_name: tab.customerName || "Cliente",
    phone: tab.phone || "",
    credit_limit: Number(tab.creditLimit || defaultCreditLimit),
    payment: tab.payment || "Dinheiro",
    status,
    total,
    opened_at: tab.openedAt || new Date().toISOString(),
    closed_at: status === "closed" ? (tab.closedAt || new Date().toISOString()) : null,
    closed_by: status === "closed" ? closedBy : null,
    cash_session_id: cashSessionId,
    items_json: JSON.stringify(tab.items || []),
    notes: JSON.stringify({ ...tab, items: undefined }),
    updated_at: new Date().toISOString(),
  };
}

export function buildTabItemsPayload(tab) {
  return (tab.items || []).map((item) => ({
    tab_account_id: tab.id,
    product_id: Number.isFinite(Number(item.id)) ? Number(item.id) : null,
    name: item.name || "Produto",
    quantity: Number(item.quantity || 1),
    price: Number(item.price || 0),
    barcode: item.barcode || "",
  }));
}

export async function persistTabAccountInSupabase(tab, status = "open", options = {}) {
  const payload = buildTabAccountPayload(tab, status, options);

  const { error: insertError } = await insertWithSchemaRetry("tab_accounts", payload, false);
  if (insertError) {
    const message = String(insertError.message || insertError || "").toLowerCase();
    if (!message.includes("duplicate") && !message.includes("duplic") && !message.includes("23505")) {
      return { error: insertError };
    }

    const { error: updateError } = await updateWithSchemaRetry("tab_accounts", tab.id, payload);
    if (updateError) return { error: updateError };
  }

  const itemsPayload = buildTabItemsPayload(tab);
  const { data: replaceItemsResult, error: replaceItemsError } = await supabase.rpc("replace_tab_account_items", {
    p_tab_account_id: tab.id,
    p_items: itemsPayload,
  });

  if (replaceItemsError || replaceItemsResult?.success === false) {
    const reason = replaceItemsError?.message || replaceItemsResult?.error || "verifique a função replace_tab_account_items";
    return {
      error: new Error(`Comanda salva parcialmente: dados principais salvos, mas os itens não foram substituídos com segurança (${reason}). Rode supabase/migracao-final-producao-6-0-36.sql.`),
    };
  }

  return { error: null };
}
