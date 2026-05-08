import { supabase } from "../supabaseClient";
import { insertWithSchemaRetry, updateWithSchemaRetry } from "./supabaseSchema";
import { formatBrazilMobilePhone, onlyPhoneNumbers, formatCep } from "../utils/formatters";

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
  };
}

export async function loadClientsFromSupabase() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true });

  return {
    clients: Array.isArray(data) ? data.map(mapClientFromDatabase) : [],
    error,
  };
}

export async function insertClientInSupabase(clientToInsert) {
  return insertWithSchemaRetry("clients", clientToInsert, false);
}

export async function updateClientInSupabase(id, clientPatch) {
  return updateWithSchemaRetry("clients", id, clientPatch);
}
