import { supabase } from "../supabaseClient";
import { insertWithSchemaRetry, updateWithSchemaRetry } from "./supabaseSchema";
import { normalizeBarcode } from "../utils/formatters";
import { toNonNegativeNumber } from "../utils/numbers";

export function normalizeProductVariants(variants) {
  const parsed = typeof variants === "string" ? (() => { try { return JSON.parse(variants); } catch { return []; } })() : variants;
  return (Array.isArray(parsed) ? parsed : [])
    .map((variant, index) => ({
      id: variant.id || `${Date.now()}-${index}`,
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
    active: product.active === true,
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
    active: product.active === true,
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
