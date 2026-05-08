import { supabase } from "../supabaseClient";

export function getMissingColumnName(error) {
  const message = String(error?.message || error || "");
  const patterns = [
    /Could not find the ['"`]([^'"`]+)['"`] column/i,
    /(?:column|coluna)\s+['"`]([^'"`]+)['"`]/i,
    /['"`]([^'"`]+)['"`]\s+(?:column|coluna)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "";
}

export function payloadHasColumn(payload, columnName) {
  if (!columnName) return false;
  if (Array.isArray(payload)) return payload.some((row) => Object.prototype.hasOwnProperty.call(row || {}, columnName));
  return Object.prototype.hasOwnProperty.call(payload || {}, columnName);
}

export function removeColumnFromPayload(payload, columnName) {
  if (Array.isArray(payload)) {
    return payload.map((row) => {
      const nextRow = { ...(row || {}) };
      delete nextRow[columnName];
      return nextRow;
    });
  }

  const nextPayload = { ...(payload || {}) };
  delete nextPayload[columnName];
  return nextPayload;
}

export async function insertWithSchemaRetry(tableName, payload, selectSingle = false) {
  let currentPayload = Array.isArray(payload) ? payload.map((row) => ({ ...(row || {}) })) : { ...(payload || {}) };
  const ignoredColumns = [];

  for (let attempt = 0; attempt < 25; attempt += 1) {
    let query = supabase.from(tableName).insert(currentPayload);
    if (selectSingle) query = query.select().single();

    const { data, error } = await query;
    if (!error) return { data, error: null, ignoredColumns };

    const missingColumn = getMissingColumnName(error);
    if (!missingColumn || !payloadHasColumn(currentPayload, missingColumn)) {
      return { data: null, error, ignoredColumns };
    }

    console.warn(`Coluna ${missingColumn} não existe em ${tableName}. Enviando novamente sem essa coluna.`);
    ignoredColumns.push(missingColumn);
    currentPayload = removeColumnFromPayload(currentPayload, missingColumn);
  }

  return {
    data: null,
    error: new Error(`Não foi possível salvar em ${tableName}: muitas colunas incompatíveis com o Supabase.`),
    ignoredColumns,
  };
}

export async function updateWithSchemaRetry(tableName, id, patch) {
  let currentPatch = { ...(patch || {}) };
  const ignoredColumns = [];

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const { error } = await supabase.from(tableName).update(currentPatch).eq("id", id);
    if (!error) return { error: null, ignoredColumns };

    const missingColumn = getMissingColumnName(error);
    if (!missingColumn || !payloadHasColumn(currentPatch, missingColumn)) {
      return { error, ignoredColumns };
    }

    console.warn(`Coluna ${missingColumn} não existe em ${tableName}. Atualizando novamente sem essa coluna.`);
    ignoredColumns.push(missingColumn);
    currentPatch = removeColumnFromPayload(currentPatch, missingColumn);
  }

  return {
    error: new Error(`Não foi possível atualizar ${tableName}: muitas colunas incompatíveis com o Supabase.`),
    ignoredColumns,
  };
}
