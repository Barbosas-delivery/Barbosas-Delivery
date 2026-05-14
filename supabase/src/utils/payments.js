import { PAYMENT_STATUS } from "../constants/appConstants";
import { money } from "./formatters";

export function getPaymentLabel(payment, changeFor, mixedPaymentDetails = "") {
  if (payment === "Misto") return mixedPaymentDetails ? `Misto - ${mixedPaymentDetails}` : "Misto - formas informadas no fechamento";
  if (payment !== "Dinheiro") return payment || "Pagamento não informado";
  return changeFor ? `Dinheiro - troco para ${money(changeFor)}` : "Dinheiro - sem troco informado";
}

export function createEmptyMixedPayment() {
  return { pix: "", cash: "", debit: "", credit: "" };
}

export function getMixedPaymentTotal(parts = {}) {
  return Number(parts.pix || 0) + Number(parts.cash || 0) + Number(parts.debit || 0) + Number(parts.credit || 0);
}

export function getMixedPaymentDetails(parts = {}) {
  return [
    ["Pix", parts.pix],
    ["Dinheiro", parts.cash],
    ["Débito", parts.debit],
    ["Crédito", parts.credit],
  ]
    .filter(([, value]) => Number(value || 0) > 0)
    .map(([label, value]) => `${label}: ${money(value)}`)
    .join(" • ");
}

export function isMixedPaymentBalanced(parts = {}, total = 0) {
  return Math.abs(getMixedPaymentTotal(parts) - Number(total || 0)) < 0.01;
}

export function isOrderAboveMinimum(productsTotal, minimumOrderValue) {
  return Number(productsTotal || 0) >= Number(minimumOrderValue || 0);
}

export function getPaymentStatusClass(paymentStatus) {
  if (paymentStatus === PAYMENT_STATUS.PAID) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (paymentStatus === PAYMENT_STATUS.STORE_CREDIT) return "bg-purple-100 text-purple-700 border-purple-200";
  if (paymentStatus === PAYMENT_STATUS.RECEIVABLE) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-700 border-red-200";
}
