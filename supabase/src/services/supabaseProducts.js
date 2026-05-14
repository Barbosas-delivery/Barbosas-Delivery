import { supabase } from "../supabaseClient";
import { insertWithSchemaRetry, updateWithSchemaRetry } from "./supabaseSchema";
import { normalizeBarcode } from "../utils/formatters";
import { toNonNegativeNumber } from "../utils/numbers";
import { isTruthyActive } from "../utils/auth";

export function normalizeProductVariants(variants) {
  const parsed = typeof variants === "string" ? (() => { try { return JSON.parse(variants); } catch { return []; } })() : variants;
  return (Array.isArray(parsed) ? parsed : [])
    .map((variant, index) => ({
      id: variant.id || `variant-${Date.now()}-${Math.random().toString(36).slice(2)}-${index}`,
      name: String(variant.name || "").trim(),
      imageUrl: variant.imageUrl || variant.image_url || "",
      active: variant.active !== false,
    }))
    .filter((variant) => variant.name);
}

export function mapProductFromDatabase(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category || "",
    price: Number(product.price || 0),
    cost: Number(product.cost || 0),
    stock: Number(product.stock || 0),
    minStock: Number(product.min_stock || 0),
    deletedAt: product.deleted_at || product.deletedAt || "",
    pausedUntil: product.paused_until || product.pausedUntil || "",
    pauseReason: product.pause_reason || product.pauseReason || "",
    barcode: product.barcode || "",
    expirationDate: product.expiration_date || "",
    imageUrl: product.image_url || "",
    hasVariants: product.has_variants === true || product.hasVariants === true,
    variants: normalizeProductVariants(product.variants || product.product_variants || []),
    active: isTruthyActive(product.active),
  };
}

export function buildProductInsertPayload(newProduct, productId) {
  const barcode = normalizeBarcode(newProduct.barcode);
  return {
    id: productId,
    name: String(newProduct.name || "").trim(),
    category: newProduct.category,
    price: toNonNegativeNumber(newProduct.price, 0),
    cost: toNonNegativeNumber(newProduct.cost, 0),
    stock: toNonNegativeNumber(newProduct.stock, 0),
    min_stock: toNonNegativeNumber(newProduct.minStock, 0),
    barcode,
    expiration_date: newProduct.expirationDate || null,
    image_url: newProduct.imageUrl || "",
    has_variants: newProduct.hasVariants === true,
    variants: normalizeProductVariants(newProduct.variants),
    paused_until: newProduct.pausedUntil || null,
    pause_reason: newProduct.pauseReason || "",
    active: true,
  };
}

export function buildProductPatch(product) {
  return {
    name: String(product.name || "").trim(),
    category: product.category,
    price: Number(product.price || 0),
    cost: Number(product.cost || 0),
    stock: Number(product.stock || 0),
    min_stock: Number(product.minStock || 0),
    barcode: normalizeBarcode(product.barcode),
    expiration_date: product.expirationDate || null,
    image_url: product.imageUrl || "",
    has_variants: product.hasVariants === true,
    variants: normalizeProductVariants(product.variants),
    paused_until: product.pausedUntil || null,
    pause_reason: product.pauseReason || "",
    active: isTruthyActive(product.active),
  };
}

export async function loadProductsFromSupabase() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  return {
    products: Array.isArray(data) ? data.filter((product) => !product.deleted_at).map(mapProductFromDatabase) : [],
    error,
  };
}

export async function insertProductInSupabase(productToInsert) {
  return insertWithSchemaRetry("products", productToInsert, false);
}

export async function updateProductInSupabase(id, productPatch) {
  return updateWithSchemaRetry("products", id, productPatch);
}

export async function updateProductStatusInSupabase(id, active) {
  const { error } = await supabase.from("products").update({ active }).eq("id", id);
  return { error };
}

export async function updateProductImageInSupabase(id, imageUrl) {
  return updateWithSchemaRetry("products", id, { image_url: imageUrl || "" });
}

export async function softDeleteProductInSupabase(id) {
  return updateWithSchemaRetry("products", id, { active: false, deleted_at: new Date().toISOString() });
}

export async function findProductByBarcodeInSupabase(barcode) {
  const normalizedBarcode = normalizeBarcode(barcode);
  if (!normalizedBarcode) return { product: null, matches: [], error: null };

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("barcode", normalizedBarcode)
    .limit(25);

  const matches = (Array.isArray(data) ? data : []).map(mapProductFromDatabase);
  const activeProduct = matches.find((product) => isTruthyActive(product.active) && !product.deletedAt);
  const reusableProduct = matches.find((product) => product.deletedAt || product.active !== true);
  const product = activeProduct || reusableProduct || matches[0] || null;

  return { product, matches, error };
}

export async function restoreProductInSupabase(productId, barcode, productPatch) {
  const normalizedBarcode = normalizeBarcode(barcode);
  const patch = {
    ...productPatch,
    barcode: normalizedBarcode,
    active: true,
    deleted_at: null,
  };

  return updateWithSchemaRetry("products", productId, patch);
}

export async function applyProductStockDeltasInSupabase(stockDeltas = []) {
  const deltas = (Array.isArray(stockDeltas) ? stockDeltas : [])
    .map((item) => ({
      product_id: Number(item.productId ?? item.product_id),
      delta: Number(item.delta || 0),
    }))
    .filter((item) => Number.isFinite(item.product_id) && item.delta !== 0);

  if (deltas.length === 0) return { error: null, fallbackUsed: false, data: { success: true, failures: [] } };

  const { data, error } = await supabase.rpc("apply_product_stock_deltas", { p_deltas: deltas });
  if (error) {
    const rpcMissing = /function|schema cache|apply_product_stock_deltas|could not find/i.test(String(error.message || error));
    const message = rpcMissing
      ? "Migração de estoque atômico não encontrada. Rode supabase/migracao-final-producao-6-0-30.sql antes de operar vendas."
      : (error.message || "Falha ao aplicar movimento de estoque no Supabase.");
    return { error: new Error(message), fallbackUsed: false, data: null };
  }

  const failed = Array.isArray(data?.failures) ? data.failures : [];
  if (data?.success === false || failed.length > 0) {
    const insufficient = failed.filter((item) => item?.error === "insufficient_stock");
    const notFound = failed.filter((item) => item?.error === "not_found");
    const reasons = [];
    if (insufficient.length) reasons.push(`${insufficient.length} produto(s) sem estoque suficiente`);
    if (notFound.length) reasons.push(`${notFound.length} produto(s) não encontrado(s)`);
    return {
      error: new Error(`Estoque não atualizado: ${reasons.join("; ") || "verifique produtos e quantidades"}.`),
      fallbackUsed: false,
      data,
    };
  }

  return { error: null, fallbackUsed: false, data };
}
