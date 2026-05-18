import { PRINT_JOB_TYPE, PRINT_JOB_SOURCE } from "../constants/appConstants";
import { escapeHtml, money } from "./formatters";
import { toSafeMoneyNumber } from "./numbers";

function safeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function line(label, value) {
  const cleanValue = safeText(value);
  return cleanValue ? `${label}: ${cleanValue}` : "";
}

function compactLines(lines = []) {
  return lines.map((item) => String(item || "").trim()).filter(Boolean);
}

function formatDateTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toLocaleString("pt-BR");
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function normalizeAddon(addon = {}) {
  if (typeof addon === "string") return { name: safeText(addon, "Adicional"), price: 0 };
  return {
    id: addon.id ?? addon.addonId ?? addon.name ?? "",
    name: safeText(addon.name || addon.title || addon.label, "Adicional"),
    price: toSafeMoneyNumber(addon.price || addon.value, 0),
  };
}

function normalizeItems(items = []) {
  return Array.isArray(items) ? items.map((item) => {
    const quantity = Math.max(1, Number(item.quantity || 1));
    const unitPrice = toSafeMoneyNumber(item.unitPrice ?? item.price, 0);
    const addons = Array.isArray(item.selectedAddons) ? item.selectedAddons.map(normalizeAddon) : [];
    const comboChoices = Array.isArray(item.selectedComboChoices) ? item.selectedComboChoices.map((choice) => ({
      id: choice.id || choice.label || "",
      label: safeText(choice.label || choice.name, "Escolha"),
      options: (Array.isArray(choice.options) ? choice.options : []).map(normalizeAddon),
    })).filter((choice) => choice.options.length > 0) : [];
    const addonsTotal = toSafeMoneyNumber(item.addonsTotal, addons.reduce((sum, addon) => sum + toSafeMoneyNumber(addon.price, 0), 0));
    const basePrice = toSafeMoneyNumber(item.basePrice, Math.max(0, unitPrice - addonsTotal));
    return {
      ...item,
      name: safeText(item.name, "Produto"),
      quantity,
      unitPrice,
      basePrice,
      addonsTotal,
      total: toSafeMoneyNumber(item.total, unitPrice * quantity),
      notes: safeText(item.itemNote || item.notes || item.observation || item.note),
      selectedAddons: addons,
      selectedComboChoices: comboChoices,
      removedIngredients: Array.isArray(item.removedIngredients) ? item.removedIngredients.map((ingredient) => safeText(ingredient)).filter(Boolean) : [],
      category: safeText(item.category || item.productCategory || item.product_type),
    };
  }) : [];
}

function hasPreparationDetails(item = {}) {
  return Boolean(item.selectedAddons?.length || item.selectedComboChoices?.length || item.removedIngredients?.length || item.notes);
}

function buildAddonText(addons = [], { showPrices = false } = {}) {
  return addons.map((addon) => {
    const price = toSafeMoneyNumber(addon.price, 0);
    return `${addon.name}${showPrices && price > 0 ? ` (+${money(price)})` : ""}`;
  }).join(", ");
}

function buildItemsText(items = [], { showPrices = false, kitchen = false } = {}) {
  return normalizeItems(items).flatMap((item, index) => compactLines([
    kitchen ? `ITEM ${index + 1} - ${item.quantity}x ${item.name}` : showPrices ? `${item.quantity}x ${item.name} - ${money(item.total)}` : `${item.quantity}x ${item.name}`,
    item.selectedComboChoices.length > 0 ? `ESCOLHAS: ${item.selectedComboChoices.map((choice) => `${choice.label}: ${buildAddonText(choice.options, { showPrices })}`).join("; ")}` : "",
    item.selectedAddons.length > 0 ? `+ ${buildAddonText(item.selectedAddons, { showPrices })}` : "",
    item.removedIngredients.length > 0 ? `SEM: ${item.removedIngredients.map((ingredient) => ingredient.toUpperCase()).join(", ")}` : "",
    item.notes ? `OBS DO ITEM: ${item.notes}` : "",
    item.isKit ? `Kit${item.kitId ? ` #${item.kitId}` : ""}` : "",
  ]));
}

function buildKitchenItemsHtml(items = []) {
  return normalizeItems(items).map((item, index) => `
    <article class="prep-item ${hasPreparationDetails(item) ? "has-details" : ""}">
      <div class="item-head">
        <span class="item-index">ITEM ${index + 1}</span>
        <strong>${escapeHtml(`${item.quantity}x ${item.name}`)}</strong>
      </div>
      ${item.selectedComboChoices.length > 0 ? `<div class="prep-box choice"><b>ESCOLHAS DO COMBO</b>${item.selectedComboChoices.map((choice) => `<span>${escapeHtml(choice.label)}: ${escapeHtml(buildAddonText(choice.options, { showPrices: false }))}</span>`).join("")}</div>` : ""}
      ${item.selectedAddons.length > 0 ? `<div class="prep-box addon"><b>ADICIONAIS</b>${item.selectedAddons.map((addon) => `<span>+ ${escapeHtml(addon.name)}</span>`).join("")}</div>` : ""}
      ${item.removedIngredients.length > 0 ? `<div class="prep-box remove"><b>REMOVER / SEM</b>${item.removedIngredients.map((ingredient) => `<span>SEM ${escapeHtml(ingredient.toUpperCase())}</span>`).join("")}</div>` : ""}
      ${item.notes ? `<div class="prep-box note"><b>OBS DO ITEM</b><span>${escapeHtml(item.notes)}</span></div>` : ""}
      ${item.isKit ? `<small class="muted-line">Kit${item.kitId ? ` #${escapeHtml(String(item.kitId))}` : ""}</small>` : ""}
    </article>
  `).join("");
}

function buildItemsHtml(items = [], { showPrices = false } = {}) {
  return normalizeItems(items).map((item) => `
    <div class="sale-item">
      <div class="sale-line"><b>${escapeHtml(`${item.quantity}x ${item.name}`)}</b>${showPrices ? `<span>${escapeHtml(money(item.total))}</span>` : ""}</div>
      ${item.selectedComboChoices.length > 0 ? `<small><b>Escolhas:</b> ${escapeHtml(item.selectedComboChoices.map((choice) => `${choice.label}: ${buildAddonText(choice.options, { showPrices })}`).join("; "))}</small>` : ""}
      ${item.selectedAddons.length > 0 ? `<small><b>Adicionais:</b> ${escapeHtml(buildAddonText(item.selectedAddons, { showPrices }))}</small>` : ""}
      ${item.removedIngredients.length > 0 ? `<small><b>Sem:</b> ${escapeHtml(item.removedIngredients.join(", "))}</small>` : ""}
      ${item.notes ? `<small><b>Obs:</b> ${escapeHtml(item.notes)}</small>` : ""}
      ${item.isKit ? `<small>Kit${item.kitId ? ` #${escapeHtml(String(item.kitId))}` : ""}</small>` : ""}
    </div>
  `).join("");
}

function buildTotalsHtml(totals = {}) {
  const productsTotal = toSafeMoneyNumber(totals.productsTotal, 0);
  const deliveryFee = toSafeMoneyNumber(totals.deliveryFee, 0);
  const discount = toSafeMoneyNumber(totals.discount, 0);
  const total = toSafeMoneyNumber(totals.total, productsTotal + deliveryFee - discount);
  return `
    <div class="totals">
      <p><span>Produtos</span><b>${escapeHtml(money(productsTotal))}</b></p>
      ${deliveryFee > 0 ? `<p><span>Entrega</span><b>${escapeHtml(money(deliveryFee))}</b></p>` : ""}
      ${discount > 0 ? `<p><span>Desconto</span><b>-${escapeHtml(money(discount))}</b></p>` : ""}
      <p class="grand"><span>TOTAL</span><b>${escapeHtml(money(total))}</b></p>
    </div>
  `;
}

function buildHtmlTicket(title, sections = [], options = {}) {
  const sectionsHtml = sections.map((section) => `
    <section class="${escapeHtml(section.className || "")}">
      ${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ""}
      ${(section.lines || []).map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
      ${section.html || ""}
    </section>
  `).join("");

  const isKitchen = options.variant === "kitchen";
  const isDelivery = options.variant === "delivery";

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: 80mm auto; margin: 3mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; width: 74mm; margin: 0 auto; color: #000; font-size: ${isDelivery ? "13px" : "12px"}; font-weight: 600; }
    h1 { text-align: center; font-size: ${isKitchen ? "24px" : "20px"}; margin: 0 0 5px; border: 2px solid #000; padding: 6px 3px; letter-spacing: .5px; }
    h2 { font-size: 13px; margin: 10px 0 5px; border-top: 1px dashed #111; padding-top: 7px; }
    p { margin: 3px 0; line-height: 1.25; }
    .center { text-align: center; }
    .big { font-size: 16px; font-weight: 900; }
    .sale-item { margin: 5px 0; border-bottom: 1px dotted #999; padding-bottom: 4px; }
    .sale-line { display: flex; justify-content: space-between; gap: 8px; }
    small { display: block; margin: 2px 0 0 8px; font-size: 11px; line-height: 1.25; }
    .prep-item { border: 2px solid #000; padding: 6px; margin: 7px 0; page-break-inside: avoid; }
    .prep-item.has-details { border-width: 3px; }
    .item-head { display: flex; flex-direction: column; gap: 3px; }
    .item-head strong { font-size: 18px; line-height: 1.1; }
    .item-index { font-size: 11px; font-weight: 900; letter-spacing: .5px; }
    .prep-box { border-top: 1px dashed #111; margin-top: 5px; padding-top: 5px; }
    .prep-box b, .prep-box span { display: block; }
    .prep-box b { font-size: 11px; margin-bottom: 3px; }
    .prep-box span { font-size: 15px; line-height: 1.22; font-weight: 900; }
    .remove { border: 2px solid #000; padding: 5px; margin-top: 6px; }
    .remove span { font-size: 17px; }
    .note span { font-size: 14px; }
    .muted-line { margin-left: 0; }
    .highlight-box { border: 2px solid #000; padding: 5px; margin: 5px 0; font-size: 14px; }
    .totals { border-top: 2px solid #000; margin-top: 6px; padding-top: 4px; }
    .totals p { display: flex; justify-content: space-between; gap: 8px; }
    .totals .grand { font-size: 20px; font-weight: 900; border-top: 1px solid #000; padding-top: 4px; }
  </style>
</head>
<body>
  <h1>BARBOSA'S LANCHES</h1>
  <p class="center big">${escapeHtml(title)}</p>
  ${sectionsHtml}
</body>
</html>`;
}

function baseOrderLines(payload = {}) {
  const order = payload.order || {};
  return compactLines([
    `Pedido/Venda #${safeText(order.id, "-")}`,
    line("Origem", getSourceLabel(payload.source, order.origin)),
    line("Status", order.status),
    line("Horário", formatDateTime(order.launchedAt || payload.createdAt)),
    line("Referência", order.reference),
  ]);
}

function getSourceLabel(source, origin) {
  if (source === PRINT_JOB_SOURCE.CUSTOMER_APP || origin === "customer") return "Aplicativo";
  if (source === PRINT_JOB_SOURCE.PDV_COUNTER) return "PDV Balcão";
  if (source === PRINT_JOB_SOURCE.PDV_DELIVERY) return "PDV Entregas";
  return safeText(source || origin, "Sistema");
}

function buildKitchenTicket(payload = {}) {
  const order = payload.order || {};
  const customer = payload.customer || {};
  const orderNotes = safeText(order.notes);
  const sections = [
    { title: "Pedido", lines: compactLines([...baseOrderLines(payload), line("Cliente", customer.name)]) },
    { title: "Itens para preparo", html: buildKitchenItemsHtml(payload.items), lines: buildItemsText(payload.items, { kitchen: true }) },
    { title: "Observação geral", className: orderNotes ? "highlight-box" : "", lines: compactLines([orderNotes || "Sem observação geral"]) },
  ];
  return {
    title: "COZINHA",
    subtitle: "Via de preparo",
    widthMm: 80,
    copies: 1,
    lines: sections.flatMap((section) => compactLines([section.title ? `--- ${section.title.toUpperCase()} ---` : "", ...(section.lines || [])])),
    html: buildHtmlTicket("COZINHA", sections, { variant: "kitchen" }),
    sections,
  };
}

function buildDeliveryTicket(payload = {}) {
  const customer = payload.customer || {};
  const delivery = payload.delivery || {};
  const payment = payload.payment || {};
  const totals = payload.totals || {};
  const sections = [
    { title: "Pedido", lines: baseOrderLines(payload) },
    { title: "Cliente", lines: compactLines([line("Nome", customer.name), line("Telefone", customer.phone)]) },
    { title: "Endereço de entrega", className: "highlight-box", lines: compactLines([delivery.address, line("Bairro", delivery.district), line("Zona", delivery.zone), line("Referência", payload.order?.reference), line("Entregador", delivery.courierName)]) },
    { title: "Pagamento", html: buildTotalsHtml(totals), lines: compactLines([line("Forma", payment.method), line("Status", payment.status), line("Troco para", payment.changeFor), line("Detalhes", payment.mixedPaymentDetails), `Total: ${money(totals.total)}`]) },
    { title: "Itens do pedido", html: buildItemsHtml(payload.items, { showPrices: false }), lines: buildItemsText(payload.items, { showPrices: false }) },
    { title: "Observação geral", lines: compactLines([payload.order?.notes || "Sem observação geral"]) },
  ];
  return {
    title: "ENTREGA",
    subtitle: "Via do entregador",
    widthMm: 80,
    copies: 1,
    lines: sections.flatMap((section) => compactLines([section.title ? `--- ${section.title.toUpperCase()} ---` : "", ...(section.lines || [])])),
    html: buildHtmlTicket("ENTREGA", sections, { variant: "delivery" }),
    sections,
  };
}

function buildCounterTicket(payload = {}) {
  const payment = payload.payment || {};
  const totals = payload.totals || {};
  const sections = [
    { title: "Venda", lines: baseOrderLines(payload) },
    { title: "Itens", html: buildItemsHtml(payload.items, { showPrices: true }), lines: buildItemsText(payload.items, { showPrices: true }) },
    { title: "Pagamento", html: buildTotalsHtml(totals), lines: compactLines([line("Forma", payment.method), line("Status", payment.status), `Produtos: ${money(totals.productsTotal)}`, totals.discount ? `Desconto: ${money(totals.discount)}` : "", `Total: ${money(totals.total)}`]) },
    { title: "Observação", lines: compactLines([payload.order?.notes || "Sem observação"]) },
  ];
  return {
    title: "BALCÃO",
    subtitle: "Via do caixa",
    widthMm: 80,
    copies: 1,
    lines: sections.flatMap((section) => compactLines([section.title ? `--- ${section.title.toUpperCase()} ---` : "", ...(section.lines || [])])),
    html: buildHtmlTicket("BALCÃO", sections, { variant: "counter" }),
    sections,
  };
}

export function buildPrintTicket(payload = {}, printType = PRINT_JOB_TYPE.KITCHEN) {
  if (printType === PRINT_JOB_TYPE.DELIVERY) return buildDeliveryTicket(payload);
  if (printType === PRINT_JOB_TYPE.COUNTER) return buildCounterTicket(payload);
  return buildKitchenTicket(payload);
}
