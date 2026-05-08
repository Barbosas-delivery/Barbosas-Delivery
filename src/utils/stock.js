import { toPositiveInteger } from "./numbers";

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

export function validateOrderItems(items, products) {
  if (!items || items.length === 0) return { valid: false, message: "Adicione pelo menos um produto ao pedido." };

  const stockItems = expandItemsForStock(items);
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
    if (Number(product.stock || 0) < Number(quantity || 0)) {
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
          };
        }),
      };
    }

    const product = products.find((currentProduct) => currentProduct.id === item.id);
    return {
      ...item,
      name: product?.name || item.name,
      price: Number(product?.price ?? item.price ?? 0),
      barcode: product?.barcode || item.barcode,
    };
  });
}

export function reduceProductStock(products, items) {
  const stockItems = expandItemsForStock(items);
  return products.map((product) => {
    const totalQuantity = stockItems
      .filter((item) => Number(item.id) === Number(product.id))
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    if (!totalQuantity) return product;
    return { ...product, stock: Math.max(0, Number(product.stock || 0) - totalQuantity) };
  });
}

export function restoreProductStock(products, items) {
  const stockItems = expandItemsForStock(items || []);
  return products.map((product) => {
    const totalQuantity = stockItems
      .filter((item) => Number(item.id) === Number(product.id))
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    if (!totalQuantity) return product;
    return { ...product, stock: Number(product.stock || 0) + totalQuantity };
  });
}
