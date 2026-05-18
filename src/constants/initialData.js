import { DELIVERY_FEE, PAYMENT_STATUS, DELIVERY_STATUS } from "./appConstants";

export const initialStoreSettings = {
  storeName: "Barbosa's Lanches",
  storePhone: "(43) 98873-6791",
  defaultDeliveryFee: DELIVERY_FEE,
  minimumOrderValue: 20,
  allowUnlistedDistricts: true,
  maxActiveDeliveriesPerCourier: 2,
  deliveryZones: [
    { id: 1, district: "Centro", fee: DELIVERY_FEE, minimumOrderValue: 20, active: true },
    { id: 2, district: "Zona 7", fee: 7, minimumOrderValue: 25, active: true },
  ],
  whatsappMessage: "Olá, seu pedido do Barbosa's Lanches está em preparo.",
  statusWhatsappMessages: {
    approved: "Olá, {cliente}! Seu pedido #{pedido} foi aprovado pela {loja}.\n\nPrevisão: {previsao}.\nTotal: {total}.\n\nObrigado pela preferência!",
    outForDelivery: "Olá, {cliente}! Seu pedido #{pedido} saiu para entrega.\n\nO entregador já está a caminho. Total: {total}.\n\nObrigado pela preferência!",
    delivered: "Olá, {cliente}! Seu pedido #{pedido} foi entregue.\n\nA {loja} agradece pela preferência!",
    cancelled: "Olá, {cliente}. Seu pedido #{pedido} foi cancelado pela {loja}.\n\nSe precisar, responda esta mensagem para falar com a loja.",
    paymentReminder: "Olá, {cliente}! Passando para lembrar sobre o pagamento do pedido #{pedido}.\n\nValor: {total}. Forma informada: {pagamento}.",
  },
  autoPrintCustomerOrders: true,
  customerOrderPrintCopies: 2,
  manualReprintCopies: 1,
  printCloseDelaySeconds: 3,
  printOutputMode: "browser",
  localPrintServiceUrl: "http://localhost:9191/print",
  localPrintFallbackToBrowser: true,
  localPrintTimeoutMs: 5000,
  storePausedUntil: "",
  storePauseReason: "",
  openingHours: "Terça a quinta das 18:00 às 23:30 • Sexta e sábado das 18:00 às 00:30 • Domingo das 18:00 às 23:30",
  isOpen: true,
  schedule: [
    { day: 1, label: "Segunda", closed: false, open: "09:00", close: "00:00" },
    { day: 2, label: "Terça", closed: false, open: "09:00", close: "00:00" },
    { day: 3, label: "Quarta", closed: false, open: "09:00", close: "00:00" },
    { day: 4, label: "Quinta", closed: false, open: "09:00", close: "00:00" },
    { day: 5, label: "Sexta", closed: false, open: "09:00", close: "03:00" },
    { day: 6, label: "Sábado", closed: false, open: "09:00", close: "03:00" },
    { day: 0, label: "Domingo", closed: false, open: "13:00", close: "00:00" },
  ],
};

export const initialProductGroups = ["Lanches", "Combos", "Porções", "Bebidas", "Sobremesas", "Molhos e adicionais"];

export const initialPromotions = [
  {
    id: 1,
    title: "COMBO DA CASA",
    description: "Lanche principal, batata e bebida com preço especial.",
    productId: 1,
    badge: "Mais pedido",
    imageUrl: "",
    discountPercent: 10,
    promotionalPrice: 31.5,
    startDate: "",
    endDate: "",
    active: true,
  },
];

export const initialKits = [
  {
    id: 1,
    name: "Combo X-Salada",
    description: "X-Salada, batata pequena e refrigerante lata.",
    items: [
      { productId: 1, quantity: 1 },
      { productId: 2, quantity: 1 },
    ],
    price: 35,
    endDate: "",
    active: true,
  },
];

export const initialProducts = [
  {
    id: 1,
    name: "X-Salada",
    category: "Lanches",
    productType: "lanche",
    price: 28,
    cost: 13,
    stock: 50,
    minStock: 10,
    barcode: "7898172662170",
    ingredients: ["Pão", "Hambúrguer", "Queijo", "Alface", "Tomate", "Milho", "Batata palha", "Molho da casa"],
    removableIngredients: ["Alface", "Tomate", "Milho", "Batata palha", "Molho da casa"],
    defaultAddons: [
      { id: "bacon-extra", name: "Bacon extra", price: 5, active: true },
      { id: "cheddar", name: "Cheddar", price: 4, active: true },
      { id: "ovo", name: "Ovo", price: 3, active: true },
      { id: "hamburguer-extra", name: "Hambúrguer extra", price: 8, active: true }
    ],
    comboChoices: [
      { id: "ponto-carne", label: "Ponto da carne", required: false, max: 1, options: [{ id: "normal", name: "Normal", price: 0 }, { id: "bem-passado", name: "Bem passado", price: 0 }] }
    ],
    sauceLimit: 1,
    prepMinutes: 25,
    salesTags: ["Mais vendido", "Recomendado"],
    suggestedProductIds: ["2"],
    allowItemNotes: true,
    pausedUntil: "",
    pauseReason: "",
    active: true,
  },
  {
    id: 2,
    name: "Batata frita pequena",
    category: "Porções",
    productType: "porcao",
    price: 12,
    cost: 5.5,
    stock: 40,
    minStock: 10,
    barcode: "7898172662171",
    ingredients: ["Batata", "Sal"],
    removableIngredients: ["Sal"],
    defaultAddons: [
      { id: "cheddar", name: "Cheddar", price: 4, active: true },
      { id: "bacon", name: "Bacon", price: 5, active: true }
    ],
    comboChoices: [
      { id: "molho", label: "Molho", required: false, max: 1, options: [{ id: "maionese-verde", name: "Maionese verde", price: 0 }, { id: "barbecue", name: "Barbecue", price: 0 }, { id: "cheddar-extra", name: "Cheddar extra", price: 2 }] }
    ],
    sauceLimit: 1,
    prepMinutes: 18,
    salesTags: ["Crocante", "Combina com lanche"],
    suggestedProductIds: ["1"],
    allowItemNotes: true,
    pausedUntil: "",
    pauseReason: "",
    active: true,
  },
];

export const initialClients = [
  {
    id: 1,
    name: "João Silva",
    phone: "(43) 99999-0000",
    cep: "87000-000",
    street: "Av. Brasil",
    number: "1500",
    district: "Centro",
    city: "Maringá",
    state: "PR",
    reference: "Próximo ao mercado",
  },
];

export const initialCouriers = [
  {
    id: 1,
    name: "Motoboy Teste",
    username: "moto01",
    password: "B4rb@2026!",
    active: true,
    createdAt: "02/05/2026 14:30",
    motorcycleType: "Moto própria",
  },
];

export const initialDeliveries = [
  {
    id: 1023,
    client: "João Silva",
    phone: "(43) 99999-0000",
    address: "Av. Brasil, 1500 - Centro",
    payment: "Pix",
    paymentStatus: PAYMENT_STATUS.PAID,
    productsTotal: 37,
    deliveryFee: DELIVERY_FEE,
    courierFee: 0,
    storeFee: 0,
    motorcycleType: "",
    value: 42,
    status: DELIVERY_STATUS.WAITING_PICKUP,
    reference: "Próximo ao mercado",
    courierUsername: "ALL",
    courierName: "Todos os motoboys",
    pickedUpByUsername: "",
    pickedUpByName: "",
    pickedUpAt: "",
    deliveredByUsername: "",
    deliveredByName: "",
    deliveredAt: "",
    ownerApproved: false,
    ownerApprovedAt: "",
    launchedAt: "2026-05-02T14:30:00.000Z",
  },
  {
    id: 1024,
    client: "Maria Souza",
    phone: "(43) 98888-1111",
    address: "Rua Paraná, 80 - Zona 7",
    payment: "Dinheiro",
    paymentStatus: PAYMENT_STATUS.PENDING,
    productsTotal: 24,
    deliveryFee: DELIVERY_FEE,
    courierFee: 0,
    storeFee: 0,
    motorcycleType: "",
    value: 29,
    status: DELIVERY_STATUS.WAITING_PICKUP,
    reference: "Casa com portão preto",
    courierUsername: "ALL",
    courierName: "Todos os motoboys",
    pickedUpByUsername: "",
    pickedUpByName: "",
    pickedUpAt: "",
    deliveredByUsername: "",
    deliveredByName: "",
    deliveredAt: "",
    ownerApproved: false,
    ownerApprovedAt: "",
    launchedAt: "2026-05-02T15:10:00.000Z",
  },
];
