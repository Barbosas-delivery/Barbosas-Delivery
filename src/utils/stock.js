import { toPositiveInteger } from "./numbers";

export function isStockControlledProduct(product = {}) {
  if (!product) return true;
  if (product.stockControlled !== undefined) return product.stockControlled === true;
  if (product.stock_controlled !== undefined) return product.stock_controlled === true;
  const type = String(product.productType || product.product_type || product.category || "").toLowerCase();
  if (/(lanche|hamb[uú]rguer|hamburguer|por[cç][aã]o|combo)/.test(type)) return false;
  return true;
}

export function expandItemsForStock(items) {
  return (items || []).flatMap((item) => {
    if (item.isKit && Array.isArray(item.kitItems)) {
      return item.kitItems.map((kitItem) => ({
        ...kitItem,
        quantity: toPositiveInteger(kitItem.quantity, 0) * toPositiveInteger(item.quantity, 1),
      }));
    }
    return item;
  });
}

export function expandStockControlledItems(items) {
  return expandItemsForStock(items || []).filter((item) => isStockControlledProduct(item));
}

export function validateOrderItems(items, products) {
  if (!items || items.length === 0) return { valid: false, message: "Adicione pelo menos um produto ao pedido." };

  const stockItems = expandStockControlledItems(items);
  if (stockItems.some((item) => item.id === undefined || item.id === null || toPositiveInteger(item.quantity, 0) <= 0)) {
    return { valid: false, message: "Existe item inválido no pedido. Remova e adicione novamente." };
  }

  const quantitiesByProduct = stockItems.reduce((acc, item) => {
    acc[item.id] = Number(acc[item.id] || 0) + toPositiveInteger(item.quantity, 0);
    return acc;
  }, {});

  for (const [productId, quantity] of Object.entries(quantitiesByProduct)) {
    const product = products.find((currentProduct) => currentProduct.id === Number(productId));
    if (!product || product.active !== true) {
      return { valid: false, message: "Produto indisponível no pedido. Remova para continuar." };
    }
    if (isStockControlledProduct(product) && Number(product.stock || 0) < Number(quantity || 0)) {
      return { valid: false, message: `Estoque insuficiente para ${product.name}. Disponível: ${product.stock}.` };
    }
  }

  return { valid: true, message: "" };
}

export function syncOrderItemsWithProducts(items, products) {
  return (items || []).map((item) => {
    if (item.isKit) {
      return {
        ...item,
        price: Number(item.price || 0),
        kitItems: (item.kitItems || []).map((kitItem) => {
          const product = products.find((currentProduct) => currentProduct.id === Number(kitItem.id));
          return {
            ...kitItem,
            id: product?.id ?? kitItem.id,
            name: product?.name || kitItem.name,
            price: Number(product?.price ?? kitItem.price ?? 0),
            barcode: product?.barcode || kitItem.barcode || "",
            category: product?.category || kitItem.category || "",
            productType: product?.productType || product?.product_type || kitItem.productType || kitItem.product_type || "",
            stockControlled: product ? isStockControlledProduct(product) : isStockControlledProduct(kitItem),
            stock: Number(product?.stock ?? kitItem.stock ?? 0),
          };
        }),
      };
    }

    const product = products.find((currentProduct) => currentProduct.id === item.id);
    return {
      ...item,
      name: item.variantName ? (item.name || product?.name || "Produto") : (product?.name || item.name),
      productName: item.productName || product?.name || item.name,
      price: Number(item.price ?? product?.price ?? 0),
      originalPrice: Number(item.originalPrice ?? product?.price ?? item.price ?? 0),
      promotionId: item.promotionId || null,
      barcode: product?.barcode || item.barcode,
      variantId: item.variantId || null,
      variantName: item.variantName || "",
      imageUrl: item.imageUrl || product?.imageUrl || "",
      category: product?.category || item.category || "",
      productType: product?.productType || product?.product_type || item.productType || item.product_type || "",
      stockControlled: product ? isStockControlledProduct(product) : isStockControlledProduct(item),
      stock: Number(product?.stock ?? item.stock ?? 0),
    };
  });
}

export function reduceProductStock(products, items) {
  const stockItems = expandStockControlledItems(items);
  return products.map((product) => {
    const totalQuantity = stockItems
      .filter((item) => Number(item.id) === Number(product.id))
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    if (!totalQuantity || !isStockControlledProduct(product)) return product;
    return { ...product, stock: Math.max(0, Number(product.stock || 0) - totalQuantity) };
  });
}

export function restoreProductStock(products, items) {
  const stockItems = expandStockControlledItems(items || []);
  return products.map((product) => {
    const totalQuantity = stockItems
      .filter((item) => Number(item.id) === Number(product.id))
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    if (!totalQuantity || !isStockControlledProduct(product)) return product;
    return { ...product, stock: Number(product.stock || 0) + totalQuantity };
  });
}
