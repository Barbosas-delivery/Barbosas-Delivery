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

function normalizeItems(items = []) {
  return Array.isArray(items) ? items.map((item) => ({
    ...item,
    name: safeText(item.name, "Produto"),
    quantity: Math.max(1, Number(item.quantity || 1)),
    unitPrice: toSafeMoneyNumber(item.unitPrice ?? item.price, 0),
    total: toSafeMoneyNumber(item.total, toSafeMoneyNumber(item.unitPrice ?? item.price, 0) * Math.max(1, Number(item.quantity || 1))),
    notes: safeText(item.notes || item.observation || item.note),
  })) : [];
}

function buildItemsText(items = [], { showPrices = false } = {}) {
  return normalizeItems(items).flatMap((item) => compactLines([
    showPrices
      ? `${item.quantity}x ${item.name} - ${money(item.total)}`
      : `${item.quantity}x ${item.name}`,
    item.notes ? `   Obs: ${item.notes}` : "",
    item.isKit ? `   Kit${item.kitId ? ` #${item.kitId}` : ""}` : "",
  ]));
}

function buildItemsHtml(items = [], { showPrices = false } = {}) {
  return normalizeItems(items).map((item) => `
    <div class="item">
      <div><b>${escapeHtml(`${item.quantity}x ${item.name}`)}</b>${showPrices ? `<span>${escapeHtml(money(item.total))}</span>` : ""}</div>
      ${item.notes ? `<small>Obs: ${escapeHtml(item.notes)}</small>` : ""}
      ${item.isKit ? `<small>Kit${item.kitId ? ` #${escapeHtml(String(item.kitId))}` : ""}</small>` : ""}
    </div>
  `).join("");
}

function buildHtmlTicket(title, sections = []) {
  const sectionsHtml = sections.map((section) => `
    <section>
      ${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ""}
      ${(section.lines || []).map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
      ${section.html || ""}
    </section>
  `).join("");

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: 80mm auto; margin: 3mm; }
    body { font-family: Arial, sans-serif; width: 74mm; margin: 0 auto; color: #111; font-size: 12px; }
    h1 { text-align: center; font-size: 18px; margin: 0 0 6px; }
    h2 { font-size: 13px; margin: 10px 0 4px; border-top: 1px dashed #111; padding-top: 6px; }
    p { margin: 2px 0; }
    .center { text-align: center; }
    .big { font-size: 15px; font-weight: 700; }
    .item { margin: 4px 0; }
    .item div { display: flex; justify-content: space-between; gap: 8px; }
    small { display: block; margin-left: 8px; }
  </style>
</head>
<body>
  <h1>BARBOSA'S DELIVERY</h1>
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
  const sections = [
    { title: "Pedido", lines: baseOrderLines(payload) },
    { title: "Itens para preparo", html: buildItemsHtml(payload.items, { showPrices: false }), lines: buildItemsText(payload.items, { showPrices: false }) },
    { title: "Observações", lines: compactLines([order.notes || "Sem observações"]) },
  ];
  return {
    title: "COZINHA",
    subtitle: "Via de preparo",
    widthMm: 80,
    copies: 1,
    lines: sections.flatMap((section) => compactLines([section.title ? `--- ${section.title.toUpperCase()} ---` : "", ...(section.lines || [])])),
    html: buildHtmlTicket("COZINHA", sections),
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
    { title: "Endereço", lines: compactLines([delivery.address, line("Bairro", delivery.district), line("Zona", delivery.zone), line("Entregador", delivery.courierName)]) },
    { title: "Pagamento", lines: compactLines([line("Forma", payment.method), line("Status", payment.status), line("Troco para", payment.changeFor), line("Detalhes", payment.mixedPaymentDetails), `Total: ${money(totals.total)}`]) },
    { title: "Itens", html: buildItemsHtml(payload.items, { showPrices: false }), lines: buildItemsText(payload.items, { showPrices: false }) },
  ];
  return {
    title: "ENTREGA",
    subtitle: "Via do entregador",
    widthMm: 80,
    copies: 1,
    lines: sections.flatMap((section) => compactLines([section.title ? `--- ${section.title.toUpperCase()} ---` : "", ...(section.lines || [])])),
    html: buildHtmlTicket("ENTREGA", sections),
    sections,
  };
}

function buildCounterTicket(payload = {}) {
  const payment = payload.payment || {};
  const totals = payload.totals || {};
  const sections = [
    { title: "Venda", lines: baseOrderLines(payload) },
    { title: "Itens", html: buildItemsHtml(payload.items, { showPrices: true }), lines: buildItemsText(payload.items, { showPrices: true }) },
    { title: "Pagamento", lines: compactLines([line("Forma", payment.method), line("Status", payment.status), `Produtos: ${money(totals.productsTotal)}`, totals.discount ? `Desconto: ${money(totals.discount)}` : "", `Total: ${money(totals.total)}`]) },
  ];
  return {
    title: "BALCÃO",
    subtitle: "Via do caixa",
    widthMm: 80,
    copies: 1,
    lines: sections.flatMap((section) => compactLines([section.title ? `--- ${section.title.toUpperCase()} ---` : "", ...(section.lines || [])])),
    html: buildHtmlTicket("BALCÃO", sections),
    sections,
  };
}

export function buildPrintTicket(payload = {}, printType = PRINT_JOB_TYPE.KITCHEN) {
  if (printType === PRINT_JOB_TYPE.DELIVERY) return buildDeliveryTicket(payload);
  if (printType === PRINT_JOB_TYPE.COUNTER) return buildCounterTicket(payload);
  return buildKitchenTicket(payload);
}
