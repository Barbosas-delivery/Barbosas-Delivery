import { supabase } from "../supabaseClient";
import { insertWithSchemaRetry } from "./supabaseSchema";

export function mapCashClosingFromDatabase(row = {}) {
  return {
    id: row.id,
    openedAt: row.opened_at || "",
    closedAt: row.closed_at || "",
    totalSold: Number(row.total_sold || 0),
    totalReceived: Number(row.total_received || 0),
    countedCash: Number(row.counted_cash || 0),
    difference: Number(row.difference || 0),
    byPayment: {
      Pix: Number(row.pix_total || 0),
      Dinheiro: Number(row.cash_total || 0),
      "Cartão débito": Number(row.debit_total || 0),
      "Cartão crédito": Number(row.credit_total || 0),
    },
    pendingAmount: Number(row.pending_total || 0),
    cancelledAmount: Number(row.cancelled_total || 0),
    closingSnapshot: row.closing_snapshot || null,
  };
}

export function mapOpenCashSessionFromDatabase(row = {}, sangrias = []) {
  return {
    isOpen: true,
    id: row.id,
    openedAt: row.opened_at || new Date().toISOString(),
    closedAt: "",
    openingAmount: Number(row.opening_amount || 0),
    sangrias,
  };
}

export function createClosedCashSessionState() {
  return { isOpen: false, id: "", openedAt: "", closedAt: "", openingAmount: 0, sangrias: [] };
}

export async function loadCashDataFromSupabase() {
  const { data: sessionsData, error: sessionsError } = await supabase
    .from("cash_sessions")
    .select("*")
    .order("opened_at", { ascending: false });

  if (sessionsError) {
    return { error: sessionsError, cashClosings: [], cashSession: null };
  }

  const sessions = Array.isArray(sessionsData) ? sessionsData : [];
  const cashClosings = sessions
    .filter((row) => String(row.status || "") === "closed")
    .map(mapCashClosingFromDatabase);

  const openSession = sessions.find((row) => String(row.status || "") === "open");
  if (!openSession) {
    return { error: null, cashClosings, cashSession: createClosedCashSessionState() };
  }

  let sangrias = [];
  try {
    const { data: movementRows } = await supabase
      .from("cash_movements")
      .select("*")
      .gte("created_at", openSession.opened_at || new Date(0).toISOString());

    sangrias = (Array.isArray(movementRows) ? movementRows : [])
      .filter((row) => String(row.movement_type || row.type || "") === "sangria")
      .map((row) => ({
        id: row.id,
        value: Number(row.value || row.amount || 0),
        reason: row.reason || "Sangria",
        createdAt: row.created_at || new Date().toISOString(),
      }));
  } catch (error) {
    console.warn("Sangrias não carregadas:", error);
  }

  return {
    error: null,
    cashClosings,
    cashSession: mapOpenCashSessionFromDatabase(openSession, sangrias),
  };
}

export async function findOpenCashSessionFromSupabase() {
  const { data, error } = await supabase
    .from("cash_sessions")
    .select("id, opened_at, opening_amount")
    .eq("status", "open")
    .limit(1);

  return { data: Array.isArray(data) && data.length > 0 ? data[0] : null, error };
}

export async function openCashSessionInSupabase({ openingAmount = 0, openedBy = "" } = {}) {
  const openedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("cash_sessions")
    .insert({
      status: "open",
      opening_amount: openingAmount,
      opened_at: openedAt,
      opened_by: openedBy,
      notes: "Abertura de caixa pelo painel",
    })
    .select("*")
    .single();

  return { data, error, openedAt };
}

export async function insertCashSangriaInSupabase({ cashSession = {}, value = 0, reason = "Sangria" } = {}) {
  const movement = {
    id: Date.now(),
    value,
    reason: reason || "Sangria",
    createdAt: new Date().toISOString(),
  };

  const payload = {
    id: movement.id,
    movement_type: "sangria",
    type: "sangria",
    value,
    amount: value,
    reason: movement.reason,
    created_at: movement.createdAt,
    opened_at: cashSession.openedAt || null,
    notes: JSON.stringify(movement),
  };

  const { error } = await insertWithSchemaRetry("cash_movements", payload, false);
  return { movement, error };
}

export async function closeCashSessionInSupabase(sessionId, payload) {
  const { error } = await supabase.from("cash_sessions").update(payload).eq("id", sessionId);
  return { error };
}
