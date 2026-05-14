import { supabase } from "../supabaseClient";
import { insertWithSchemaRetry, updateWithSchemaRetry } from "./supabaseSchema";
import { formatBrazilMobilePhone, onlyPhoneNumbers, formatCep } from "../utils/formatters";
import { isTruthyActive } from "../utils/auth";

export function mapClientFromDatabase(client) {
  return {
    id: client.id,
    name: client.name || "",
    phone: client.phone || "",
    cep: client.cep || "",
    street: client.street || "",
    number: client.number || "",
    district: client.district || "",
    city: client.city || "",
    state: client.state || "",
    reference: client.reference || "",
    active: isTruthyActive(client.active),
    deletedAt: client.deleted_at || client.deletedAt || "",
  };
}

export function mapClientToDatabase(client) {
  return {
    id: client.id,
    name: String(client.name || "").trim(),
    phone: formatBrazilMobilePhone(client.phone),
    phone_digits: onlyPhoneNumbers(client.phone),
    cep: formatCep(client.cep),
    street: String(client.street || "").trim(),
    number: String(client.number || "").trim(),
    district: String(client.district || "").trim(),
    city: String(client.city || "").trim(),
    state: String(client.state || "").toUpperCase().slice(0, 2),
    reference: String(client.reference || "").trim(),
    active: isTruthyActive(client.active),
  };
}

export async function loadClientsFromSupabase() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true });

  return {
    clients: Array.isArray(data) ? data.filter((client) => isTruthyActive(client.active) && !client.deleted_at).map(mapClientFromDatabase) : [],
    error,
  };
}

export async function insertClientInSupabase(clientToInsert) {
  return insertWithSchemaRetry("clients", clientToInsert, false);
}

export async function updateClientInSupabase(id, clientPatch) {
  return updateWithSchemaRetry("clients", id, clientPatch);
}

export async function softDeleteClientInSupabase(id) {
  return updateWithSchemaRetry("clients", id, { active: false, deleted_at: new Date().toISOString() });
}
