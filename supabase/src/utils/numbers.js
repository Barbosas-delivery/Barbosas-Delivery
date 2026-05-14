export function toNonNegativeNumber(value, fallback = 0) {
  const number = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(number) || number < 0) return fallback;
  return number;
}

export function toNullableNumber(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim().replace(",", ".");
  if (text === "") return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

export function toPositiveInteger(value, fallback = 1) {
  const number = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(number)) return fallback;
  return Math.max(1, Math.floor(number));
}

export function toSafeMoneyNumber(value, fallback = 0) {
  const number = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(number) ? number : fallback;
}

export function toSafeNumber(value, fallback = 0) {
  return toSafeMoneyNumber(value, fallback);
}

export function calculateChangeDue(changeFor, total) {
  const received = toSafeMoneyNumber(changeFor, 0);
  const saleTotal = toSafeMoneyNumber(total, 0);
  if (received <= 0 || received < saleTotal) return 0;
  return received - saleTotal;
}
