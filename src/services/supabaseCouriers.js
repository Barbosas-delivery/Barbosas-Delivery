import { supabase } from "../supabaseClient";
import { normalizeCourierCredential, isTruthyActive } from "../utils/auth";
import { insertWithSchemaRetry, updateWithSchemaRetry } from "./supabaseSchema";

export function mapCourierFromDatabase(courier = {}) {
  return {
    id: courier.id,
    name: courier.name || "",
    username: normalizeCourierCredential(courier.username).toLowerCase(),
    password: normalizeCourierCredential(courier.password),
    active: isTruthyActive(courier.active),
    createdAt: courier.created_at || courier.createdAt || "",
    motorcycleType: courier.motorcycle_type || courier.motorcycleType || "Moto própria",
  };
}

export function mapCourierToDatabase(courier = {}) {
  return {
    id: courier.id,
    name: String(courier.name || "").trim(),
    username: normalizeCourierCredential(courier.username).toLowerCase(),
    password: normalizeCourierCredential(courier.password),
    active: isTruthyActive(courier.active),
    motorcycle_type: courier.motorcycleType || "Moto própria",
    created_at: courier.createdAt || new Date().toISOString(),
  };
}

export async function loadCouriersFromSupabase() {
  const { data, error } = await supabase
    .from("couriers")
    .select("*")
    .order("name", { ascending: true });

  return {
    couriers: error ? [] : (Array.isArray(data) ? data.map(mapCourierFromDatabase) : []),
    error,
  };
}

export async function insertCourierInSupabase(courierPayload) {
  return insertWithSchemaRetry("couriers", courierPayload, false);
}

export async function updateCourierStatusInSupabase(id, active) {
  return updateWithSchemaRetry("couriers", id, { active });
}

export async function updateCourierInSupabase(id, courierPatch) {
  return updateWithSchemaRetry("couriers", id, courierPatch);
}
