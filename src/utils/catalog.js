import { toNonNegativeNumber } from "./numbers";

export function calculatePromotionFromPercent(productPrice, percent) {
  const safePrice = toNonNegativeNumber(productPrice, 0);
  const safePercent = Math.min(99, Math.max(0, toNonNegativeNumber(percent, 0)));
  return Math.max(0, safePrice - safePrice * (safePercent / 100));
}

export function getPromotionPercent(promotion) {
  return Math.min(99, Math.max(0, toNonNegativeNumber(promotion?.discountPercent, 0)));
}

export function getPromotionPrice(product, promotion) {
  if (!product || !promotion) return Number(product?.price || 0);
  const promotionalPrice = toNonNegativeNumber(promotion.promotionalPrice, 0);
  if (promotionalPrice > 0 && promotionalPrice < toNonNegativeNumber(product.price, 0)) return promotionalPrice;
  const percent = getPromotionPercent(promotion);
  if (percent > 0) return calculatePromotionFromPercent(product.price, percent);
  return toNonNegativeNumber(product.price, 0);
}

export function getProductActivePromotion(product, promotions = []) {
  if (!product) return null;
  return (Array.isArray(promotions) ? promotions : [])
    .filter((promotion) => Number(promotion.productId) === Number(product.id) && promotion.active && isPromotionInPeriod(promotion) && getPromotionPrice(product, promotion) < Number(product.price || 0))
    .sort((a, b) => {
      const aTime = new Date(a.createdAt || a.created_at || 0).getTime() || Number(a.id || 0);
      const bTime = new Date(b.createdAt || b.created_at || 0).getTime() || Number(b.id || 0);
      return bTime - aTime;
    })[0] || null;
}

export function getProductSalePrice(product, promotions = []) {
  const promotion = getProductActivePromotion(product, promotions);
  return promotion ? getPromotionPrice(product, promotion) : Number(product?.price || 0);
}

export function isPromotionInPeriod(promotion, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  if (promotion.startDate && today < promotion.startDate) return false;
  if (promotion.endDate && today > promotion.endDate) return false;
  return true;
}

export function getActivePromotions(promotions, products) {
  return promotions.filter((promotion) => {
    const product = products.find((item) => item.id === Number(promotion.productId));
    return promotion.active && product && getProductAvailabilityStatus(product).available && isPromotionInPeriod(promotion) && getPromotionPrice(product, promotion) < Number(product.price || 0);
  });
}

export function getPromotionProduct(products, promotion) {
  return products.find((product) => product.id === Number(promotion.productId));
}

export function buildKitProductsTotal(kitItems, products) {
  return (kitItems || []).reduce((sum, item) => {
    const product = products.find((currentProduct) => currentProduct.id === Number(item.productId));
    return sum + Number(product?.price || 0) * Number(item.quantity || 0);
  }, 0);
}

export function isKitInPeriod(kit, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  if (kit.endDate && today > kit.endDate) return false;
  return true;
}

export function getActiveKits(kits, products) {
  return kits.filter((kit) => {
    if (!kit.active || !isKitInPeriod(kit)) return false;
    if (!kit.items || kit.items.length === 0) return false;

    const quantitiesByProduct = kit.items.reduce((acc, item) => {
      const productId = Number(item.productId);
      acc[productId] = Number(acc[productId] || 0) + Number(item.quantity || 0);
      return acc;
    }, {});

    return Object.entries(quantitiesByProduct).every(([productId, quantity]) => {
      const product = products.find((currentProduct) => currentProduct.id === Number(productId));
      return product && getProductAvailabilityStatus(product).available && Number(product.stock || 0) >= Number(quantity || 0);
    });
  });
}

export function getCustomerVisibleKits(kits, products = []) {
  return (Array.isArray(kits) ? kits : []).filter((kit) => {
    if (!kit || !kit.active || !isKitInPeriod(kit) || !Array.isArray(kit.items) || kit.items.length === 0) return false;
    return kit.items.every((item) => {
      const product = products.find((currentProduct) => Number(currentProduct.id) === Number(item.productId));
      return product && getProductAvailabilityStatus(product).available && Number(product.stock || 0) >= Number(item.quantity || 0);
    });
  });
}

export function getKitItemsForOrder(kit, products) {
  return (kit.items || []).map((item) => {
    const product = products.find((currentProduct) => currentProduct.id === Number(item.productId));
    return {
      id: product?.id,
      name: product?.name || "Produto do kit",
      price: Number(product?.price || 0),
      quantity: Number(item.quantity || 0),
      barcode: product?.barcode || "",
      kitName: kit.name,
    };
  });
}

export function describeKitItems(kit, products) {
  return (kit.items || [])
    .map((item) => {
      const product = products.find((currentProduct) => currentProduct.id === Number(item.productId));
      return `${item.quantity}x ${product?.name || "Produto removido"}`;
    })
    .join(", ");
}

export function isProductPaused(product, now = new Date()) {
  if (!product) return false;
  const pausedUntil = product.pausedUntil || product.paused_until || "";
  if (!pausedUntil) return false;
  const untilTime = new Date(pausedUntil).getTime();
  if (!Number.isFinite(untilTime)) return false;
  return untilTime > now.getTime();
}

export function getProductAvailabilityStatus(product, now = new Date()) {
  if (!product || product.active !== true) return { available: false, label: "Inativo" };
  if (isProductPaused(product, now)) {
    const until = new Date(product.pausedUntil || product.paused_until);
    const timeLabel = Number.isFinite(until.getTime()) ? until.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "em breve";
    return { available: false, label: `Pausado até ${timeLabel}` };
  }
  return { available: true, label: "Ativo" };
}

export function getActiveProducts(products, now = new Date()) {
  return products.filter((product) => getProductAvailabilityStatus(product, now).available === true);
}

export function normalizeGroupName(groupName) {
  return String(groupName || "").trim();
}

export function hasDuplicateGroup(groups, groupName) {
  const normalizedGroup = normalizeGroupName(groupName).toLowerCase();
  return groups.some((group) => group.toLowerCase() === normalizedGroup);
}

export function getVisibleProductGroups(products, groups) {
  const activeProductGroups = products.filter((product) => getProductAvailabilityStatus(product).available).map((product) => normalizeGroupName(product.category)).filter(Boolean);
  return groups.filter((group) => activeProductGroups.includes(group));
}

export function groupProductsByCategory(products, groups) {
  return groups.map((group) => ({
    group,
    products: products.filter((product) => normalizeGroupName(product.category) === group),
  })).filter((section) => section.products.length > 0);
}
