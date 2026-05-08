import { supabase } from "../supabaseClient";
import { insertWithSchemaRetry, updateWithSchemaRetry } from "./supabaseSchema";
import { normalizeBarcode } from "../utils/formatters";
import { toNonNegativeNumber } from "../utils/numbers";

export function mapProductFromDatabase(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category || "",
    price: Number(product.price || 0),
    cost: Number(product.cost || 0),
    stock: Number(product.stock || 0),
    minStock: Number(product.min_stock || 0),
    ncm: product.ncm || "",
    barcode: product.barcode || "",
    expirationDate: product.expiration_date || "",
    imageUrl: product.image_url || "",
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
    ncm: String(newProduct.ncm || "").trim(),
    barcode,
    expiration_date: newProduct.expirationDate || null,
    image_url: newProduct.imageUrl || "",
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
    ncm: String(product.ncm || "").trim(),
    barcode: normalizeBarcode(product.barcode),
    expiration_date: product.expirationDate || null,
    image_url: product.imageUrl || "",
    active: product.active === true,
  };
}

export async function loadProductsFromSupabase() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  return {
    products: Array.isArray(data) ? data.map(mapProductFromDatabase) : [],
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
