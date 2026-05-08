export function money(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

export function onlyCepNumbers(cep) {
  return String(cep || "").replace(/[^0-9]/g, "");
}

export function isValidCep(cep) {
  return onlyCepNumbers(cep).length === 8;
}

export function formatCep(cep) {
  const numbers = onlyCepNumbers(cep);
  if (numbers.length !== 8) return String(cep || "");
  return numbers.slice(0, 5) + "-" + numbers.slice(5);
}

export function onlyPhoneNumbers(phone) {
  return String(phone || "").replace(/[^0-9]/g, "");
}

export function isValidBrazilMobilePhone(phone) {
  const numbers = onlyPhoneNumbers(phone);
  return numbers.length === 11 && numbers[2] === "9";
}

export function formatBrazilMobilePhone(phone) {
  const numbers = onlyPhoneNumbers(phone).slice(0, 11);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 3) return "(" + numbers.slice(0, 2) + ") " + numbers.slice(2);
  if (numbers.length <= 7) return "(" + numbers.slice(0, 2) + ") " + numbers.slice(2, 3) + numbers.slice(3);
  return "(" + numbers.slice(0, 2) + ") " + numbers.slice(2, 3) + numbers.slice(3, 7) + "-" + numbers.slice(7, 11);
}

export function normalizePhoneInput(value) {
  return onlyPhoneNumbers(value).slice(0, 11);
}

export function normalizeBarcode(value) {
  return String(value || "").replace(/\D/g, "").trim();
}

export function normalizeIdentityName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


export function buildReceiptItemsHtml(items) {
  if (!items || items.length === 0) {
    return `<tr><td colspan="4">Pedido sem itens detalhados.</td></tr>`;
  }

  return items
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.quantity)}x</td><td>${escapeHtml(item.name)}</td><td>${money(item.price)}</td><td>${money(Number(item.price || 0) * Number(item.quantity || 0))}</td></tr>`
    )
    .join("");
}
