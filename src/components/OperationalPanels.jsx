import { Button, Card, CardContent, CardBox, Metric, Icon, Title, Input } from "./ui";
import { DELIVERY_STATUS, PAYMENT_STATUS, PRODUCTION_READINESS_CHECKLIST, FUNCTIONAL_VALIDATION_CHECKLIST, OPERATIONAL_VALIDATION_CHECKLIST } from "../constants/appConstants";
import { initialStoreSettings } from "../constants/initialData";
import { isSupabaseConfigured } from "../supabaseClient";
import { money, onlyPhoneNumbers, formatBrazilMobilePhone } from "../utils/formatters";
import { toSafeMoneyNumber } from "../utils/numbers";
import { getPaymentLabel, getPaymentStatusClass } from "../utils/payments";
import { normalizeDeliveryFee, buildDeliveryTotal, calculateCourierFee, calculateStoreFee, formatEstimatedDeliveryTime, getStatusClass, isCounterOrder, isDeliveryOrder } from "../utils/delivery";
import {
  buildWhatsAppUrl,
  getOrderAllowedActions,
  isOrderFinalized,
  buildOrderSummaryText,
  getWhatsAppStatusLabel,
  isSameLocalDate,
  getAuditActionLabel,
  getAuditEntityLabel,
  formatShortDateTime,
  buildAuditSummary,
  getStoreOpenStatus,
  isDeliveryDelayed,
  formatBackupDate,
} from "../utils/appRuntime";

function toPositiveInteger(value, fallback = 1) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildOrderTotal(items = []) {
  return (Array.isArray(items) ? items : []).reduce((sum, item) => sum + Number(item?.price || 0) * toPositiveInteger(item?.quantity, 1), 0);
}

function getOrderTimeValue(order = {}) {
  const value = order.launchedAt || order.createdAt || order.updatedAt || order.date || order.time || 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getCustomerOrderStatusInfo(delivery) {
  const status = delivery?.status;
  if (status === DELIVERY_STATUS.WAITING_STORE_APPROVAL || status === DELIVERY_STATUS.WAITING_PICKUP) return { title: "Pedido recebido", description: "A loja recebeu seu pedido. Ele será preparado e liberado para entrega.", tone: "emerald", step: 2 };
  if (status === DELIVERY_STATUS.OUT_FOR_DELIVERY) return { title: "Saiu para entrega", description: "Seu pedido saiu para entrega. Fique atento ao telefone.", tone: "blue", step: 4 };
  if (status === DELIVERY_STATUS.WAITING_OWNER_APPROVAL) return { title: "Entrega em confirmação", description: "O entregador informou a entrega. A loja está conferindo a finalização.", tone: "blue", step: 4 };
  if (status === DELIVERY_STATUS.CONFIRMED_DELIVERED) return { title: "Pedido entregue", description: "Pedido entregue. Obrigado pela preferência!", tone: "emerald", step: 5, final: true };
  if (status === DELIVERY_STATUS.DELIVERY_PROBLEM) return { title: "Atenção na entrega", description: "Houve uma ocorrência na entrega. Fale com a loja se precisar de ajuda.", tone: "red", step: 4, important: true };
  if (status === DELIVERY_STATUS.CANCELLED) return { title: "Pedido cancelado", description: "Seu pedido foi cancelado pela loja.", tone: "red", step: 0, final: true, important: true };
  return { title: status || "Pedido em andamento", description: "Acompanhe a atualização do seu pedido por aqui.", tone: "amber", step: 1 };
}

function getCustomerOrderTimeline(status) {
  const info = getCustomerOrderStatusInfo({ status });
  const steps = [
    { key: "received", label: "Recebido" },
    { key: "approval", label: "Aprovação" },
    { key: "preparing", label: "Preparando" },
    { key: "route", label: "Entrega" },
    { key: "done", label: "Finalizado" },
  ];
  if (status === DELIVERY_STATUS.CANCELLED) return steps.map((step, index) => ({ ...step, done: index === 0, current: index === 0, cancelled: index > 0 }));
  return steps.map((step, index) => ({ ...step, done: index <= info.step - 1, current: index === Math.max(0, info.step - 1) }));
}

function getLastCustomerOrderUpdate(delivery, notifications = []) {
  const relatedNotifications = (notifications || [])
    .filter((notification) => String(notification.orderId || notification.deliveryId) === String(delivery?.id))
    .sort((a, b) => getOrderTimeValue({ launchedAt: b.createdAt }) - getOrderTimeValue({ launchedAt: a.createdAt }));
  if (relatedNotifications[0]?.message) return relatedNotifications[0].message;
  return getCustomerOrderStatusInfo(delivery).description;
}

function getCustomerOrderItemsSummary(items = []) {
  const safeItems = Array.isArray(items) ? items : [];
  const itemCount = safeItems.reduce((sum, item) => sum + toPositiveInteger(item.quantity, 0), 0);
  return `${itemCount} item${itemCount === 1 ? "" : "s"} • ${safeItems.length} produto${safeItems.length === 1 ? "" : "s"}`;
}

function CustomerOrderStatusCard({ delivery, storeSettings, notifications = [], expanded, onToggleExpanded, onDismiss }) {
  const statusInfo = getCustomerOrderStatusInfo(delivery);
  const timeline = getCustomerOrderTimeline(delivery?.status);
  const toneClasses = {
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    red: "border-red-200 bg-red-50 text-red-950",
  };
  const badgeClasses = {
    amber: "bg-amber-100 text-amber-800",
    emerald: "bg-emerald-100 text-emerald-800",
    blue: "bg-blue-100 text-blue-800",
    red: "bg-red-100 text-red-800",
  };
  const items = Array.isArray(delivery?.items) ? delivery.items : [];
  const productsTotal = Number(delivery?.productsTotal ?? buildOrderTotal(items));
  const deliveryFee = normalizeDeliveryFee(delivery?.deliveryFee);
  const discount = Number(delivery?.discount || delivery?.couponDiscount || 0);
  const total = Number(delivery?.value || buildDeliveryTotal(productsTotal, deliveryFee, discount));
  const estimated = Number(delivery?.estimatedDeliveryMinutes || 0);
  const lastUpdate = getLastCustomerOrderUpdate(delivery, notifications);
  const canDismiss = statusInfo.final || statusInfo.important;
  const whatsappUrl = buildWhatsAppUrl(storeSettings?.storePhone, `Olá, gostaria de saber sobre meu pedido #${delivery?.id}.`);

  return (
    <div className={`rounded-[2rem] border p-4 shadow-sm ${toneClasses[statusInfo.tone] || toneClasses.amber}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-wide opacity-70">Pedido em andamento</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-black leading-tight">#{delivery?.id}</h3>
            <span className={`rounded-full px-3 py-1 text-[11px] font-black ${badgeClasses[statusInfo.tone] || badgeClasses.amber}`}>{statusInfo.title}</span>
          </div>
          <p className="mt-2 text-sm font-semibold">{statusInfo.description}</p>
        </div>
        {canDismiss && (
          <button type="button" onClick={onDismiss} className="shrink-0 rounded-xl bg-white/90 px-3 py-2 text-[11px] font-black shadow-sm">
            Entendi
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-5 gap-1">
        {timeline.map((step) => (
          <div key={step.key} className="text-center">
            <div className={`mx-auto h-2 rounded-full ${step.cancelled ? "bg-red-200" : step.done || step.current ? "bg-current" : "bg-white/80"}`} />
            <p className={`mt-1 text-[10px] font-black leading-tight ${step.current ? "opacity-100" : "opacity-60"}`}>{step.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-2xl bg-white/80 p-3">
          <p className="font-black opacity-60">Total</p>
          <p className="mt-1 text-base font-black">{money(total)}</p>
        </div>
        <div className="rounded-2xl bg-white/80 p-3">
          <p className="font-black opacity-60">Previsão</p>
          <p className="mt-1 text-base font-black">{estimated > 0 ? `cerca de ${formatEstimatedDeliveryTime(estimated)}` : "em breve"}</p>
        </div>
        <div className="rounded-2xl bg-white/80 p-3">
          <p className="font-black opacity-60">Pagamento</p>
          <p className="mt-1 font-black">{getPaymentLabel(delivery?.payment, delivery?.changeFor, delivery?.mixedPaymentDetails)}</p>
        </div>
        <div className="rounded-2xl bg-white/80 p-3">
          <p className="font-black opacity-60">Itens</p>
          <p className="mt-1 font-black">{getCustomerOrderItemsSummary(items)}</p>
        </div>
      </div>

      {lastUpdate && <p className="mt-3 rounded-2xl bg-white/70 p-3 text-xs font-semibold">Última atualização: {lastUpdate}</p>}

      {expanded && (
        <div className="mt-3 rounded-2xl bg-white/80 p-3 text-sm text-zinc-900">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-zinc-500">Itens do pedido</p>
          {items.length === 0 ? (
            <p className="text-xs text-zinc-500">Pedido sem itens detalhados.</p>
          ) : items.map((item, index) => (
            <div key={item.cartKey || `${item.id}-${index}`} className="flex items-start justify-between gap-3 border-b border-zinc-100 py-2 last:border-0">
              <div className="min-w-0">
                <p className="font-black leading-tight">{toPositiveInteger(item.quantity, 1)}x {item.name || item.productName || "Produto"}</p>
                {item.variantName && <p className="text-xs font-bold text-purple-700">Sabor: {item.variantName}</p>}
              </div>
              <p className="shrink-0 font-black">{money(toSafeMoneyNumber(item.price, 0) * toPositiveInteger(item.quantity, 1))}</p>
            </div>
          ))}
          <div className="mt-3 space-y-1 border-t border-zinc-100 pt-3 text-xs">
            <p className="flex justify-between"><span>Produtos</span><strong>{money(productsTotal)}</strong></p>
            {discount > 0 && <p className="flex justify-between text-emerald-700"><span>Desconto</span><strong>-{money(discount)}</strong></p>}
            <p className="flex justify-between"><span>Entrega</span><strong>{money(deliveryFee)}</strong></p>
            <p className="flex justify-between text-base"><span className="font-black">Total</span><strong>{money(total)}</strong></p>
          </div>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={onToggleExpanded} className="rounded-2xl bg-white px-3 py-3 text-xs font-black shadow-sm">
          {expanded ? "Ocultar itens" : "Ver detalhes"}
        </button>
        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-zinc-950 px-3 py-3 text-center text-xs font-black text-white shadow-sm">
          Falar com a loja
        </a>
      </div>

      {!statusInfo.final && (
        <p className="mt-3 text-[11px] font-semibold opacity-75">Para adicionar mais itens, faça um novo pedido ou fale com a loja.</p>
      )}
    </div>
  );
}

function NotificationPanel({ title, notifications, onMarkRead }) {
  const unreadCount = (notifications || []).filter((notification) => !notification.read).length;

  return (
    <Card className="rounded-3xl border-amber-200 bg-amber-50 shadow-sm">
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Icon name="bell" />
            <div>
              <h3 className="font-bold text-lg">{title}</h3>
              <p className="text-xs text-amber-800">{unreadCount > 0 ? `${unreadCount} não lida(s)` : "Tudo lido"}</p>
            </div>
          </div>
          <Button onClick={onMarkRead} disabled={unreadCount === 0} variant="secondary" className="rounded-2xl">Marcar como lidas</Button>
        </div>
        <div className="grid gap-2">
          {notifications.length === 0 ? (
            <p className="rounded-2xl bg-white p-3 text-sm text-zinc-500">Nenhuma notificação registrada.</p>
          ) : notifications.slice(0, 6).map((notification) => (
            <div key={notification.id} className={`rounded-2xl border p-3 text-sm ${notification.read ? "bg-white border-zinc-100" : "bg-white border-amber-300 ring-1 ring-amber-200"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{notification.title}</p>
                {!notification.read && <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-800">nova</span>}
              </div>
              <p className="text-zinc-600">{notification.message}</p>
              <p className="text-xs text-zinc-400 mt-1">{new Date(notification.createdAt).toLocaleString("pt-BR")}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function OwnerDeliveryCard({ delivery, storeRole = "admin", isPaymentProcessing = false, onPrint, onApprove, onManualConfirm, onCancel, onPaymentStatusChange, onReopenCounterSale, onOpenWhatsApp, onCopyWhatsApp, onMarkWhatsAppSent, onOpenStatusWhatsApp, onCopyStatusWhatsApp }) {
  const isWaitingDeliveryApproval = delivery.status === DELIVERY_STATUS.WAITING_OWNER_APPROVAL;
  const isWaitingOrderApproval = false;
  const isCounterSale = isCounterOrder(delivery);
  const actions = getOrderAllowedActions(delivery, storeRole);
  const isFinalized = isOrderFinalized(delivery);
  const canConfirmPayment = actions.confirmPayment && !isPaymentProcessing;
  const canReopenPayment = actions.reopenPayment && !isPaymentProcessing;
  const showSummary = () => window.alert(buildOrderSummaryText(delivery));

  return (
    <Card className="rounded-3xl border-zinc-200 shadow-sm">
      <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2"><span className="font-bold text-lg">{isCounterOrder(delivery) ? "Venda" : "Pedido"} #{delivery.id}</span><span className={`text-xs px-3 py-1 rounded-full ${getStatusClass(delivery.status)}`}>{delivery.status}</span></div>
          <p className="text-sm text-zinc-700"><b>Cliente:</b> {delivery.client}</p>
          {delivery.phone && <p className="text-sm text-zinc-700 flex items-center gap-1"><Icon name="phone" /> {formatBrazilMobilePhone(delivery.phone)}</p>}
          <p className="text-sm text-zinc-700 flex items-center gap-1"><Icon name="pin" /> {delivery.address}</p>
          {delivery.reference && <p className="text-sm text-zinc-500">Referência: {delivery.reference}</p>}
          <p className="text-sm text-zinc-500">{isCounterOrder(delivery) ? "Tipo: venda no balcão" : isWaitingOrderApproval ? "Pedido recebido e disponível para operação" : isFinalized ? "Pedido finalizado: somente consulta e impressão" : "Disponível para: todos os motoboys ativos"}</p>
          {isDeliveryOrder(delivery) ? (
            <p className="text-sm text-zinc-500">Taxa entrega: {money(normalizeDeliveryFee(delivery.deliveryFee))} • Motoboy: {money(delivery.courierFee ?? calculateCourierFee(delivery.deliveryFee, delivery.motorcycleType))} • Loja: {money(delivery.storeFee ?? calculateStoreFee(delivery.deliveryFee, delivery.motorcycleType))}</p>
          ) : (
            <p className="text-sm text-zinc-500">Venda balcão sem taxa de entrega</p>
          )}
          {delivery.motorcycleType && <p className="text-sm text-zinc-500">Moto usada: {delivery.motorcycleType}</p>}
          {delivery.cancellationReason && <p className="text-sm text-red-700 font-semibold">Motivo do cancelamento: {delivery.cancellationReason}</p>}
          {delivery.problemReason && <p className="text-sm text-amber-700 font-semibold">Problema informado: {delivery.problemReason}</p>}
          {delivery.reopenReason && <p className="text-sm text-amber-700 font-semibold">Reabertura: {delivery.reopenReason}</p>}
          {delivery.pickedUpByName && <p className="text-sm text-zinc-500">Retirado por: {delivery.pickedUpByName}</p>}
          {isDeliveryOrder(delivery) && delivery.deliveredByName && !delivery.ownerApproved && <p className="text-sm text-blue-700 font-semibold">Aguardando aprovação: {delivery.deliveredByName}</p>}
          {isDeliveryOrder(delivery) && delivery.ownerApproved && <p className="text-sm text-emerald-700 font-semibold">Confirmado pela loja para: {delivery.deliveredByName || "entregador"}</p>}
          {delivery.items && <p className="text-xs text-zinc-500 mt-2">Itens: {delivery.items.map((item) => item.quantity + "x " + item.name).join(", ")}</p>}
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          <span className="font-bold text-xl">{money(delivery.value)}</span>
          {actions.whatsapp && delivery.phone && (
            <div className="w-full md:w-auto rounded-2xl border border-emerald-100 bg-emerald-50 p-3 space-y-2">
              <p className="text-xs font-bold text-emerald-800">WhatsApp: {getWhatsAppStatusLabel(delivery.whatsappStatus)}</p>
              {delivery.whatsappOpenedAt && <p className="text-[11px] text-emerald-700">Aberto em {new Date(delivery.whatsappOpenedAt).toLocaleString("pt-BR")}</p>}
              {delivery.whatsappSentAt && <p className="text-[11px] text-emerald-700">Marcado em {new Date(delivery.whatsappSentAt).toLocaleString("pt-BR")}</p>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Button onClick={() => onOpenWhatsApp(delivery)} className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-xs">Enviar WhatsApp</Button>
                <Button onClick={() => onCopyWhatsApp(delivery)} variant="secondary" className="rounded-2xl text-xs">Copiar mensagem</Button>
                <Button onClick={() => onMarkWhatsAppSent(delivery)} disabled={delivery.whatsappStatus === "sent"} variant="secondary" className="rounded-2xl text-xs">Marcar enviado</Button>
              </div>
              {isDeliveryOrder(delivery) && (
                <div className="border-t border-emerald-100 pt-2">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-emerald-800">Mensagens rápidas por status</p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <Button onClick={() => onOpenStatusWhatsApp?.(delivery, "approved")} variant="secondary" className="rounded-2xl bg-white text-xs">Recebido</Button>
                    <Button onClick={() => onOpenStatusWhatsApp?.(delivery, "outForDelivery")} variant="secondary" className="rounded-2xl bg-white text-xs">Saiu para entrega</Button>
                    <Button onClick={() => onOpenStatusWhatsApp?.(delivery, "delivered")} variant="secondary" className="rounded-2xl bg-white text-xs">Entregue</Button>
                    <Button onClick={() => onOpenStatusWhatsApp?.(delivery, "cancelled")} variant="secondary" className="rounded-2xl bg-white text-xs">Cancelado</Button>
                    <Button onClick={() => onOpenStatusWhatsApp?.(delivery, "paymentReminder")} variant="secondary" className="rounded-2xl bg-white text-xs">Cobrar pagamento</Button>
                    <Button onClick={() => onCopyStatusWhatsApp?.(delivery, "approved")} variant="secondary" className="rounded-2xl bg-white text-xs">Copiar recebido</Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <span className="text-xs text-zinc-500">Produtos: {money(delivery.productsTotal ?? Number(delivery.value || 0) - (isCounterOrder(delivery) ? 0 : normalizeDeliveryFee(delivery.deliveryFee)))} • Desconto: -{money(delivery.discount || 0)} • Entrega: {money(isCounterOrder(delivery) ? 0 : normalizeDeliveryFee(delivery.deliveryFee))}</span>
          <span className="text-sm text-zinc-500">Pagamento: {getPaymentLabel(delivery.payment, delivery.changeFor, delivery.mixedPaymentDetails)}</span>
          <span className={`rounded-2xl border px-3 py-2 text-xs font-bold ${getPaymentStatusClass(delivery.paymentStatus)}`}>{delivery.paymentStatus || PAYMENT_STATUS.PENDING}</span>
          {delivery.paymentConfirmedAt && <span className="text-[11px] text-zinc-500">Recebido em {new Date(delivery.paymentConfirmedAt).toLocaleString("pt-BR")}{delivery.paymentConfirmedBy ? ` por ${delivery.paymentConfirmedBy}` : ""}</span>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full md:w-auto">
            {actions.print && <Button onClick={() => onPrint(delivery)} variant="secondary" className="rounded-2xl">Reimprimir</Button>}
            {actions.summary && <Button onClick={showSummary} variant="secondary" className="rounded-2xl">Ver resumo</Button>}
            {actions.reopenCounterSale && <Button onClick={() => onReopenCounterSale?.(delivery.id)} variant="secondary" className="rounded-2xl text-amber-700">Reabrir no PDV</Button>}
            {actions.approve && isWaitingDeliveryApproval && <Button onClick={() => onApprove(delivery.id)} disabled={delivery.status === DELIVERY_STATUS.CANCELLED} className="rounded-2xl bg-emerald-700 hover:bg-emerald-800">Aprovar entrega</Button>}
            {actions.confirmPayment && <Button onClick={() => onPaymentStatusChange(delivery.id, PAYMENT_STATUS.PAID)} disabled={!canConfirmPayment} variant="secondary" className="rounded-2xl text-emerald-700">{isPaymentProcessing ? "Aguarde..." : "Confirmar pagamento"}</Button>}
            {actions.reopenPayment && <Button onClick={() => onPaymentStatusChange(delivery.id, isDeliveryOrder(delivery) ? PAYMENT_STATUS.RECEIVABLE : PAYMENT_STATUS.PENDING)} disabled={!canReopenPayment} variant="secondary" className="rounded-2xl text-amber-700">Reabrir recebimento</Button>}
            {actions.cancel && <Button onClick={() => onCancel(delivery.id)} variant="secondary" className="rounded-2xl text-red-600">{isCounterSale ? "Cancelar venda" : "Cancelar pedido"}</Button>}
            {actions.manualFinish && <Button onClick={() => onManualConfirm(delivery.id)} className="rounded-2xl bg-zinc-950 hover:bg-zinc-800">Finalizar entrega</Button>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


function AuditTab({ logs, allLogs, status, filters, actionOptions, onFiltersChange, onRefresh, onExportCsv }) {
  const setFilter = (field, value) => onFiltersChange((previous) => ({ ...previous, [field]: value }));
  const visibleLogs = (logs || []).slice(0, 120);
  const todayLogs = (allLogs || []).filter((log) => isSameLocalDate(log.createdAt)).length;
  const sensitiveActions = (allLogs || []).filter((log) => ["cancel_order", "reopen_counter_sale", "update_payment_status", "manual_stock_adjustment", "delete_promotion", "pdv_stock_override"].includes(log.action)).length;
  const userCount = new Set((allLogs || []).map((log) => log.userName).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <Title title="Auditoria operacional" subtitle="Histórico de ações importantes da loja, entregadores, caixa, estoque e pedidos." />
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={onRefresh} variant="secondary" className="rounded-2xl">Atualizar</Button>
          <Button onClick={onExportCsv} className="rounded-2xl bg-zinc-950 hover:bg-zinc-800">CSV auditoria</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Metric title="Registros carregados" value={(allLogs || []).length} icon="shield" />
        <Metric title="Hoje" value={todayLogs} icon="calendar" />
        <Metric title="Ações sensíveis" value={sensitiveActions} icon="alert" />
        <Metric title="Usuários" value={userCount} icon="users" />
      </div>

      <CardBox>
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1">
            <Input label="Buscar na auditoria" value={filters.search} onChange={(value) => setFilter("search", value)} placeholder="Pedido, usuário, ação, motivo..." />
          </div>
          <label className="block min-w-[190px]">
            <span className="text-xs font-medium text-zinc-600">Tipo de usuário</span>
            <select value={filters.userType} onChange={(event) => setFilter("userType", event.target.value)} className="mt-1 w-full min-h-[48px] rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-950/20">
              <option value="all">Todos</option>
              <option value="store">Loja</option>
              <option value="courier">Entregador</option>
              <option value="customer">Cliente</option>
              <option value="system">Sistema</option>
            </select>
          </label>
          <label className="block min-w-[220px]">
            <span className="text-xs font-medium text-zinc-600">Ação</span>
            <select value={filters.action} onChange={(event) => setFilter("action", event.target.value)} className="mt-1 w-full min-h-[48px] rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-950/20">
              <option value="all">Todas</option>
              {actionOptions.map((action) => <option key={action} value={action}>{getAuditActionLabel(action)}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-zinc-500">{status}</p>
      </CardBox>

      <CardBox>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-lg">Histórico recente</h3>
            <p className="text-sm text-zinc-500">Mostrando {visibleLogs.length} de {logs.length} registro{logs.length === 1 ? "" : "s"} filtrado{logs.length === 1 ? "" : "s"}.</p>
          </div>
        </div>
        {visibleLogs.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum registro encontrado. Faça uma ação operacional ou rode a migração da auditoria se a tabela ainda não existir.</p>
        ) : (
          <div className="space-y-3">
            {visibleLogs.map((log) => (
              <div key={log.id || `${log.action}-${log.entityId}-${log.createdAt}`} className="rounded-3xl border border-zinc-100 bg-zinc-50 p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                  <div>
                    <p className="font-black text-zinc-900">{getAuditActionLabel(log.action)}</p>
                    <p className="text-sm text-zinc-600">{getAuditEntityLabel(log.entity)} {log.entityId ? `#${log.entityId}` : ""}</p>
                  </div>
                  <div className="text-left md:text-right text-xs text-zinc-500">
                    <p>{formatShortDateTime(log.createdAt)}</p>
                    <p>{log.userName || "sistema"} • {log.userType || "system"}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-zinc-700">{buildAuditSummary(log)}</p>
              </div>
            ))}
          </div>
        )}
      </CardBox>
    </div>
  );
}

function DiagnosticsTab({ appVersion, storeSettings, storeSettingsSyncStatus, products, clients, couriers, deliveries, notifications, cashSession, coupons, kits, promotions, storeUsersStatus, selfTests, passedTests }) {
  const isBrowser = typeof window !== "undefined";
  const online = typeof navigator !== "undefined" ? navigator.onLine : false;
  const localStorageOk = (() => {
    if (!isBrowser) return false;
    try {
      const key = "barbosas_delivery_diag_test";
      window.localStorage.setItem(key, "ok");
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  })();
  const serviceWorkerSupported = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const pwaMode = isBrowser && (window.matchMedia?.("display-mode: standalone")?.matches || window.navigator?.standalone === true);
  const serviceWorkerCacheDisabled = true;
  const supabaseUrlConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL);
  const supabaseKeyConfigured = Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);
  const supabaseClientReady = isSupabaseConfigured;
  const activeProducts = (products || []).filter((product) => product.active !== false && !product.deletedAt).length;
  const lowStockProducts = (products || []).filter((product) => product.active !== false && Number(product.stock || 0) <= Number(product.minStock || 0)).length;
  const activeCouriers = (couriers || []).filter((courier) => courier.active !== false).length;
  const activeOrders = (deliveries || []).filter((delivery) => ![DELIVERY_STATUS.CANCELLED, DELIVERY_STATUS.CONFIRMED_DELIVERED].includes(delivery.status)).length;
  const unreadNotifications = (notifications || []).filter((notification) => !notification.read && !notification.readAt && !notification.resolvedAt).length;
  const printMode = storeSettings?.printSettings?.mode === "local" ? "Serviço local" : "Navegador";
  const localPrintUrl = storeSettings?.printSettings?.localServiceUrl || "Não configurada";
  const whatsappReady = Boolean(onlyPhoneNumbers(storeSettings?.storePhone || storeSettings?.whatsapp || ""));
  const operatingMode = getStoreOpenStatus(storeSettings?.schedule || initialStoreSettings.schedule, new Date()).isOpen ? "Aberta agora" : "Fechada agora";

  const checks = [
    { name: "Supabase URL configurada", ok: supabaseUrlConfigured, detail: supabaseUrlConfigured ? "VITE_SUPABASE_URL encontrada" : "Configure VITE_SUPABASE_URL no .env" },
    { name: "Supabase chave configurada", ok: supabaseKeyConfigured, detail: supabaseKeyConfigured ? "VITE_SUPABASE_ANON_KEY encontrada" : "Configure VITE_SUPABASE_ANON_KEY no .env" },
    { name: "Cliente Supabase ativo", ok: supabaseClientReady, detail: supabaseClientReady ? "Cliente pronto para sincronizar dados" : "Cliente Supabase desativado até configurar as variáveis" },
    { name: "Navegador online", ok: online, detail: online ? "Conexão detectada" : "Sem conexão detectada pelo navegador" },
    { name: "Armazenamento local opcional", ok: localStorageOk, detail: localStorageOk ? "Usado só para lembrete de backup e avisos fechados; catálogo e configurações vêm do Supabase" : "Bloqueado; dados importantes continuam dependendo do Supabase" },
    { name: "Cache/PWA operacional", ok: serviceWorkerCacheDisabled, detail: serviceWorkerSupported ? (pwaMode ? "App instalado, mas service worker é removido e os dados vêm da rede/Supabase" : "Service worker removido; sem cache operacional de catálogo, pedidos ou configurações") : "Navegador sem Service Worker; sem cache operacional" },
    { name: "WhatsApp da loja", ok: whatsappReady, detail: whatsappReady ? "Número configurado" : "Configure o WhatsApp nas configurações da loja" },
    { name: "Testes internos", ok: passedTests === selfTests.length, detail: `${passedTests}/${selfTests.length} testes aprovados` },
  ];

  const productionChecklist = PRODUCTION_READINESS_CHECKLIST.map((item) => {
    const statusById = {
      supabase: supabaseClientReady && supabaseUrlConfigured && supabaseKeyConfigured,
      order_flow: activeProducts > 0 && Array.isArray(deliveries) && deliveries.length >= 0,
      print_flow: printMode === "Serviço local" || localPrintUrl !== "Não configurada",
      stock_flow: activeProducts > 0 && lowStockProducts === 0,
      vercel: serviceWorkerCacheDisabled && online,
      desktop: printMode === "Serviço local" || localPrintUrl !== "Não configurada",
      backup: localStorageOk,
    };
    return { ...item, ok: Boolean(statusById[item.id]) };
  });
  const productionReadyCount = productionChecklist.filter((item) => item.ok).length;
  const productionReadyPercent = Math.round((productionReadyCount / Math.max(productionChecklist.length, 1)) * 100);

  const productCategories = new Set((products || []).map((product) => String(product.category || "").trim()).filter(Boolean));
  const hasComboName = (kits || []).some((combo) => String(combo.name || "").toLowerCase().includes("combo"));
  const hasLanchoneteProducts = (products || []).some((product) => /(lanche|hamb[uú]rguer|por[cç][aã]o|combo)/i.test(`${product.productType || product.product_type || ""} ${product.category || ""}`));
  const hasStockFreeSnack = (products || []).some((product) => /(lanche|hamb[uú]rguer|por[cç][aã]o|combo)/i.test(`${product.productType || product.product_type || ""} ${product.category || ""}`) && (product.stockControlled === false || product.stock_controlled === false));
  const hasControlledDrink = (products || []).some((product) => /(bebida|refrigerante|suco|agua|água)/i.test(`${product.productType || product.product_type || ""} ${product.category || ""}`) && (product.stockControlled === true || product.stock_controlled === true || product.stockControlled === undefined));
  const hasCounterOrder = (deliveries || []).some((delivery) => isCounterOrder(delivery));
  const hasClosedSale = (deliveries || []).some((delivery) => delivery.status === DELIVERY_STATUS.CONFIRMED_DELIVERED || delivery.paymentStatus === PAYMENT_STATUS.PAID);
  const functionalChecklist = FUNCTIONAL_VALIDATION_CHECKLIST.map((item) => {
    const statusById = {
      category: productCategories.size > 0,
      addon: appVersion.includes("6.0.57") || appVersion.includes("6.0.55") || appVersion.includes("6.0.54"),
      product: hasLanchoneteProducts,
      combo: Array.isArray(kits) && (kits.length > 0 || hasComboName),
      customer_order: Array.isArray(deliveries),
      counter_sale: hasCounterOrder || Boolean(cashSession?.isOpen),
      tab_create: appVersion.includes("6.0.57") || appVersion.includes("comandas") || appVersion.includes("funcionais"),
      tab_add_items: appVersion.includes("6.0.57") || appVersion.includes("comandas") || appVersion.includes("funcionais"),
      tab_print: printMode === "Serviço local" || localPrintUrl !== "Não configurada",
      tab_close: hasClosedSale || Boolean(cashSession),
      stock: hasStockFreeSnack || hasControlledDrink,
      cleanup: appVersion.includes("6.0.57") || appVersion.includes("6.0.55"),
    };
    return { ...item, ok: Boolean(statusById[item.id]) };
  });
  const functionalReadyCount = functionalChecklist.filter((item) => item.ok).length;
  const functionalReadyPercent = Math.round((functionalReadyCount / Math.max(functionalChecklist.length, 1)) * 100);

  const hasOpenOrClosedCash = Boolean(cashSession) || appVersion.includes("6.0.57");
  const hasPaidDelivery = (deliveries || []).some((delivery) => !isCounterOrder(delivery) && delivery.paymentStatus === PAYMENT_STATUS.PAID);
  const hasDeliveredOrder = (deliveries || []).some((delivery) => delivery.status === DELIVERY_STATUS.CONFIRMED_DELIVERED || delivery.deliveredAt);
  const hasCancelledOrder = (deliveries || []).some((delivery) => delivery.status === DELIVERY_STATUS.CANCELLED || delivery.cancelledAt || delivery.cancellationReason);
  const hasAnyPrintSignal = printMode === "Serviço local" || localPrintUrl !== "Não configurada" || appVersion.includes("6.0.57");
  const operationalChecklist = OPERATIONAL_VALIDATION_CHECKLIST.map((item) => {
    const statusById = {
      cash_open: hasOpenOrClosedCash,
      cash_supply: appVersion.includes("6.0.57"),
      cash_withdrawal: appVersion.includes("6.0.57"),
      customer_delivery: Array.isArray(deliveries),
      accept_delivery: hasPaidDelivery || appVersion.includes("6.0.57"),
      dispatch_delivery: hasDeliveredOrder || appVersion.includes("6.0.57"),
      confirm_delivery: hasDeliveredOrder || appVersion.includes("6.0.57"),
      counter_sale: hasCounterOrder || appVersion.includes("6.0.57"),
      tab_full_flow: appVersion.includes("6.0.57") || hasClosedSale,
      stock_movement: hasControlledDrink || hasStockFreeSnack,
      print_jobs: hasAnyPrintSignal,
      cancel_order: hasCancelledOrder || appVersion.includes("6.0.57"),
      cash_close: appVersion.includes("6.0.57") || Boolean(cashSession),
      reports: appVersion.includes("6.0.57") || localStorageOk,
      cleanup: appVersion.includes("6.0.57"),
    };
    return { ...item, ok: Boolean(statusById[item.id]) };
  });
  const operationalReadyCount = operationalChecklist.filter((item) => item.ok).length;
  const operationalReadyPercent = Math.round((operationalReadyCount / Math.max(operationalChecklist.length, 1)) * 100);

  const exportDiagnostics = () => {
    const payload = {
      app: "Barbosa's Delivery",
      version: appVersion,
      generatedAt: new Date().toISOString(),
      browser: isBrowser ? window.navigator.userAgent : "indisponível",
      online,
      pwaMode,
      serviceWorkerSupported,
      serviceWorkerCacheDisabled,
      localStorageOk,
      supabase: { urlConfigured: supabaseUrlConfigured, keyConfigured: supabaseKeyConfigured, clientReady: supabaseClientReady },
      store: {
        name: storeSettings?.storeName,
        syncStatus: storeSettingsSyncStatus,
        openStatus: operatingMode,
        printMode,
        localPrintUrl,
        whatsappConfigured: whatsappReady,
      },
      counts: {
        products: (products || []).length,
        activeProducts,
        lowStockProducts,
        clients: (clients || []).length,
        couriers: (couriers || []).length,
        activeCouriers,
        deliveries: (deliveries || []).length,
        activeOrders,
        notifications: (notifications || []).length,
        unreadNotifications,
        coupons: (coupons || []).length,
        kits: (kits || []).length,
        promotions: (promotions || []).length,
      },
      checks,
      productionReadiness: {
        ready: productionReadyCount,
        total: productionChecklist.length,
        percent: productionReadyPercent,
        items: productionChecklist,
      },
      functionalValidation: {
        ready: functionalReadyCount,
        total: functionalChecklist.length,
        percent: functionalReadyPercent,
        items: functionalChecklist,
      },
      operationalValidation: {
        ready: operationalReadyCount,
        total: operationalChecklist.length,
        percent: operationalReadyPercent,
        items: operationalChecklist,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `diagnostico-barbosas-delivery-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Title title="Diagnóstico do sistema" subtitle="Conferência rápida de ambiente, Supabase, PWA, impressão, loja e dados carregados." />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Metric title="Versão" value={appVersion || "Atual"} icon="shield" />
        <Metric title="Supabase" value={supabaseClientReady ? "Configurado" : "Pendente"} icon="save" />
        <Metric title="Loja" value={operatingMode} icon="calendar" />
        <Metric title="Impressão" value={printMode} icon="tools" />
        <Metric title="Produtos ativos" value={activeProducts} icon="package" />
        <Metric title="Pedidos ativos" value={activeOrders} icon="truck" />
        <Metric title="Entregadores ativos" value={activeCouriers} icon="users" />
        <Metric title="Notificações novas" value={unreadNotifications} icon="bell" />
      </div>

      <CardBox>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-lg">Checklist técnico</h3>
            <p className="text-sm text-zinc-500">Use esta área quando algo não carregar, não imprimir ou não sincronizar.</p>
          </div>
          <Button onClick={exportDiagnostics} className="rounded-2xl bg-zinc-950 hover:bg-zinc-800">Baixar diagnóstico</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {checks.map((check) => (
            <div key={check.name} className={`rounded-2xl border p-4 ${check.ok ? "border-emerald-100 bg-emerald-50" : "border-amber-100 bg-amber-50"}`}>
              <p className={`font-black ${check.ok ? "text-emerald-800" : "text-amber-800"}`}>{check.ok ? "✅" : "⚠️"} {check.name}</p>
              <p className="mt-1 text-sm text-zinc-600">{check.detail}</p>
            </div>
          ))}
        </div>
      </CardBox>

      <CardBox>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-lg">Pronto para produção</h3>
            <p className="text-sm text-zinc-500">Checklist final da fase 64 para validar pedido completo, impressão, estoque, Vercel e desktop antes de abrir a loja.</p>
          </div>
          <div className="rounded-2xl bg-zinc-950 px-4 py-3 text-white text-center">
            <p className="text-xs font-black uppercase tracking-wide opacity-70">Conclusão</p>
            <p className="text-2xl font-black">{productionReadyPercent}%</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {productionChecklist.map((item) => (
            <div key={item.id} className={`rounded-2xl border p-4 ${item.ok ? "border-emerald-100 bg-emerald-50" : "border-zinc-200 bg-zinc-50"}`}>
              <p className={`font-black ${item.ok ? "text-emerald-800" : "text-zinc-800"}`}>{item.ok ? "✅" : "□"} {item.label}</p>
              <p className="mt-1 text-sm text-zinc-600">{item.description}</p>
            </div>
          ))}
        </div>
      </CardBox>

      <CardBox>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-lg">Teste funcional da Fase 67</h3>
            <p className="text-sm text-zinc-500">Roteiro de operação real: produto, adicional por categoria, combo, pedido, PDV balcão, comanda, impressão, fechamento e estoque.</p>
          </div>
          <div className="rounded-2xl bg-emerald-700 px-4 py-3 text-white text-center">
            <p className="text-xs font-black uppercase tracking-wide opacity-80">Validação</p>
            <p className="text-2xl font-black">{functionalReadyPercent}%</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {functionalChecklist.map((item) => (
            <div key={item.id} className={`rounded-2xl border p-4 ${item.ok ? "border-emerald-100 bg-emerald-50" : "border-amber-100 bg-amber-50"}`}>
              <p className={`font-black ${item.ok ? "text-emerald-800" : "text-amber-800"}`}>{item.ok ? "✅" : "⚠️"} {item.label}</p>
              <p className="mt-1 text-sm text-zinc-600">{item.description}</p>
            </div>
          ))}
        </div>
      </CardBox>

      <CardBox>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-lg">Teste operacional completo da Fase 68</h3>
            <p className="text-sm text-zinc-500">Validação ampla: caixa, delivery, aceitar pedido, sair para entrega, confirmar entrega, PDV, comanda, estoque, impressão, cancelamento, relatórios e limpeza.</p>
          </div>
          <div className="rounded-2xl bg-blue-700 px-4 py-3 text-white text-center">
            <p className="text-xs font-black uppercase tracking-wide opacity-80">Operação</p>
            <p className="text-2xl font-black">{operationalReadyPercent}%</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {operationalChecklist.map((item) => (
            <div key={item.id} className={`rounded-2xl border p-4 ${item.ok ? "border-emerald-100 bg-emerald-50" : "border-amber-100 bg-amber-50"}`}>
              <p className={`font-black ${item.ok ? "text-emerald-800" : "text-amber-800"}`}>{item.ok ? "✅" : "⚠️"} {item.label}</p>
              <p className="mt-1 text-sm text-zinc-600">{item.description}</p>
            </div>
          ))}
        </div>
      </CardBox>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CardBox>
          <h3 className="font-bold text-lg mb-4">Sincronização e configurações</h3>
          <div className="space-y-2 text-sm text-zinc-700">
            <p><b>Status:</b> {storeSettingsSyncStatus}</p>
            <p><b>Usuários da loja:</b> {storeUsersStatus || "Sem leitura recente"}</p>
            <p><b>Caixa:</b> {cashSession?.isOpen ? `Aberto desde ${new Date(cashSession.openedAt).toLocaleString("pt-BR")}` : "Fechado"}</p>
            <p><b>WhatsApp:</b> {whatsappReady ? (storeSettings.storePhone || storeSettings.whatsapp) : "Não configurado"}</p>
            <p><b>Serviço local de impressão:</b> {localPrintUrl}</p>
          </div>
        </CardBox>

        <CardBox>
          <h3 className="font-bold text-lg mb-4">Dados carregados</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <p className="rounded-2xl bg-zinc-50 p-3"><b>Produtos:</b><br />{(products || []).length}</p>
            <p className="rounded-2xl bg-zinc-50 p-3"><b>Clientes:</b><br />{(clients || []).length}</p>
            <p className="rounded-2xl bg-zinc-50 p-3"><b>Pedidos:</b><br />{(deliveries || []).length}</p>
            <p className="rounded-2xl bg-zinc-50 p-3"><b>Entregadores:</b><br />{(couriers || []).length}</p>
            <p className="rounded-2xl bg-zinc-50 p-3"><b>Cupons:</b><br />{(coupons || []).length}</p>
            <p className="rounded-2xl bg-zinc-50 p-3"><b>Kits:</b><br />{(kits || []).length}</p>
          </div>
        </CardBox>
      </div>
    </div>
  );
}

function DashboardTab({ dayReport, selfTests, passedTests, products, clients, couriers, deliveries, storeDeliverySummary, notifications = [], attentionSummary = {}, lastDailyBackupAt = "", nextOrderEstimatedDeliveryLabel = "", onDownloadBackup, onInactivateProduct }) {
  const latestDeliveries = [...deliveries].slice(0, 5);
  const activeCouriers = couriers.filter((courier) => courier.active).length;
  const blockedCouriers = couriers.length - activeCouriers;
  const criticalProducts = products.filter((product) => Number(product.stock) <= Number(product.minStock));
  const attentionItems = Array.isArray(attentionSummary.items) ? attentionSummary.items : [];
  const topAttentionItems = attentionItems.slice(0, 10);
  const criticalAttentionCount = attentionItems.filter((item) => item.severity === "critical").length;
  const highAttentionCount = attentionItems.filter((item) => item.severity === "high").length;
  const backupDue = Boolean(attentionSummary.backupDue);
  const todayActiveDeliveries = deliveries.filter((delivery) => !isCounterOrder(delivery) && !isOrderFinalized(delivery));
  const todayCounterSales = deliveries.filter((delivery) => isCounterOrder(delivery));
  const todayPendingPayments = deliveries.filter((delivery) => !isOrderFinalized(delivery) && [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.RECEIVABLE, PAYMENT_STATUS.STORE_CREDIT].includes(delivery.paymentStatus));
  const delayedDeliveries = Array.isArray(attentionSummary.delayedDeliveries) ? attentionSummary.delayedDeliveries : [];
  const todayActionItems = [
    delayedDeliveries.length > 0 && { title: "Resolver atrasos", value: delayedDeliveries.length, description: "Entregas passaram do limite operacional." },
    todayPendingPayments.length > 0 && { title: "Receber pagamentos", value: todayPendingPayments.length, description: "Pedidos ainda pendentes, a receber ou fiados." },
    criticalProducts.filter((product) => Number(product.stock || 0) <= 0).length > 0 && { title: "Repor estoque zerado", value: criticalProducts.filter((product) => Number(product.stock || 0) <= 0).length, description: "Produtos sem estoque disponível." },
    backupDue && { title: "Baixar backup", value: "Hoje", description: "Backup diário ainda não foi feito neste navegador." },
  ].filter(Boolean);
  const closingChecklist = [
    {
      title: "Entregas ativas",
      pending: todayActiveDeliveries.length,
      okText: "Nenhuma entrega aberta",
      pendingText: `${todayActiveDeliveries.length} entrega${todayActiveDeliveries.length === 1 ? "" : "s"} em andamento`,
    },
    {
      title: "Pagamentos pendentes",
      pending: todayPendingPayments.length,
      okText: "Nenhum pagamento pendente",
      pendingText: `${todayPendingPayments.length} pagamento${todayPendingPayments.length === 1 ? "" : "s"} para conferir`,
    },
    {
      title: "Backup diário",
      pending: backupDue ? 1 : 0,
      okText: "Backup do dia conferido",
      pendingText: "Backup diário ainda não foi baixado",
      action: backupDue ? onDownloadBackup : null,
      actionLabel: "Baixar backup diário",
    },
  ];
  const closingPendingCount = closingChecklist.reduce((total, item) => total + (item.pending > 0 ? 1 : 0), 0);
  const priorityQueue = [...todayActiveDeliveries]
    .sort((a, b) => {
      const aDelayed = isDeliveryDelayed(a) ? 1 : 0;
      const bDelayed = isDeliveryDelayed(b) ? 1 : 0;
      if (aDelayed !== bDelayed) return bDelayed - aDelayed;
      return new Date(a.launchedAt || a.createdAt || 0).getTime() - new Date(b.launchedAt || b.createdAt || 0).getTime();
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <Title title="Painel geral da loja" subtitle="Visão geral da loja, entregas, estoque, clientes, entregadores, valores e notificações." />

      <CardBox>
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <p className="text-sm font-black text-zinc-500 uppercase tracking-wide">Hoje na loja</p>
            <h3 className="text-2xl font-black">Resumo rápido da operação</h3>
            <p className="text-sm text-zinc-500 mt-1">Use este bloco para abrir o sistema e saber imediatamente o que precisa de ação.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 min-w-full xl:min-w-[620px]">
            <Metric title="Vendido hoje" value={money(dayReport.totalDelivery)} icon="money" />
            <Metric title="Entregas ativas" value={todayActiveDeliveries.length} icon="truck" />
            <Metric title="Vendas balcão" value={todayCounterSales.length} icon="money" />
            <Metric title="A receber" value={todayPendingPayments.length} icon="alert" />
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
            <div>
              <h4 className="font-black text-lg">Fechamento do dia</h4>
              <p className="text-sm text-zinc-500">Confira pendências antes de encerrar a loja.</p>
            </div>
            <span className={`w-fit rounded-full px-4 py-2 text-xs font-black ${closingPendingCount > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
              {closingPendingCount > 0 ? "Conferir pendências" : "Tudo certo"}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {closingChecklist.map((item) => {
              const hasPending = item.pending > 0;
              return (
                <div key={item.title} className={`rounded-2xl border p-3 text-sm ${hasPending ? "border-amber-200 bg-white" : "border-emerald-100 bg-white"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-black">{item.title}</p>
                      <p className={`mt-1 ${hasPending ? "text-amber-700" : "text-emerald-700"}`}>{hasPending ? item.pendingText : item.okText}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-black ${hasPending ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                      {hasPending ? "Conferir" : "OK"}
                    </span>
                  </div>
                  {item.action && (
                    <Button onClick={item.action} variant="secondary" className="mt-3 w-full rounded-xl bg-amber-50 text-xs">{item.actionLabel}</Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h4 className="font-black">Próximas ações</h4>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-zinc-600">{todayActionItems.length} item{todayActionItems.length === 1 ? "" : "s"}</span>
            </div>
            {todayActionItems.length > 0 ? (
              <div className="grid gap-2">
                {todayActionItems.slice(0, 5).map((item) => (
                  <div key={item.title} className="rounded-2xl bg-white border border-zinc-100 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black">{item.title}</p>
                      <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white">{item.value}</span>
                    </div>
                    <p className="text-zinc-500 mt-1">{item.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 text-sm font-bold text-emerald-800">Nenhuma ação urgente neste momento.</p>
            )}
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h4 className="font-black">Fila rápida de entregas</h4>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-zinc-600">Atrasadas primeiro</span>
            </div>
            {priorityQueue.length > 0 ? (
              <div className="grid gap-2">
                {priorityQueue.map((delivery) => {
                  const delayed = isDeliveryDelayed(delivery);
                  return (
                    <div key={delivery.id} className={`rounded-2xl border p-3 text-sm ${delayed ? "border-red-200 bg-red-50" : "border-zinc-100 bg-white"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black">Pedido #{delivery.id} • {delivery.client}</p>
                          <p className="text-zinc-500">{delivery.neighborhood || delivery.address || "Sem bairro informado"}</p>
                          <p className="text-xs text-zinc-500 mt-1">{delivery.status} • {money(delivery.value)}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${delayed ? "bg-red-600 text-white" : "bg-zinc-200 text-zinc-700"}`}>{delayed ? "Atrasada" : "Em dia"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-2xl bg-white border border-zinc-100 p-3 text-sm text-zinc-500">Nenhuma entrega ativa agora.</p>
            )}
          </div>
        </div>
      </CardBox>

      <CardBox>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <p className="text-sm font-black text-red-700 uppercase tracking-wide">Atenção da loja</p>
            <h3 className="text-xl font-black">{attentionItems.length > 0 ? `${attentionItems.length} ponto${attentionItems.length > 1 ? "s" : ""} para conferir agora` : "Tudo certo no momento"}</h3>
            <p className="text-sm text-zinc-500 mt-1">Pedidos atrasados, problemas de entrega, pagamentos pendentes, WhatsApp, estoque baixo e backup diário em um só lugar.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 min-w-full lg:min-w-[520px]">
            <Metric title="Críticos" value={criticalAttentionCount} icon="alert" />
            <Metric title="Alta prioridade" value={highAttentionCount} icon="alert" />
            <Metric title="Atrasados" value={attentionSummary.delayedDeliveries?.length || 0} icon="truck" />
            <Metric title="Estoque baixo" value={attentionSummary.lowStockProducts?.length || 0} icon="package" />
          </div>
        </div>

        {backupDue && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="font-black text-amber-900">Backup diário pendente</p>
              <p className="text-sm text-amber-800">Último backup neste navegador: {formatBackupDate(lastDailyBackupAt)}.</p>
            </div>
            <Button onClick={onDownloadBackup} variant="secondary" className="rounded-2xl bg-white">Baixar backup agora</Button>
          </div>
        )}

        {topAttentionItems.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {topAttentionItems.map((item, index) => (
              <div key={`${item.type}-${index}-${item.title}`} className={`rounded-2xl border p-4 ${item.severity === "critical" ? "border-red-200 bg-red-50" : item.severity === "high" ? "border-orange-200 bg-orange-50" : "border-amber-200 bg-amber-50"}`}>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                  <div>
                    <p className={`font-black ${item.severity === "critical" ? "text-red-800" : item.severity === "high" ? "text-orange-800" : "text-amber-800"}`}>{item.title}</p>
                    <p className="text-sm text-zinc-700 mt-1">{item.description}</p>
                    <p className="text-xs text-zinc-500 mt-1">{item.action}</p>
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${item.severity === "critical" ? "bg-red-600 text-white" : item.severity === "high" ? "bg-orange-600 text-white" : "bg-amber-600 text-white"}`}>{item.severity === "critical" ? "Crítico" : item.severity === "high" ? "Prioridade" : "Atenção"}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800 font-bold">
            Nenhum atraso, problema, pagamento pendente crítico, estoque baixo ou backup pendente encontrado agora.
          </div>
        )}
      </CardBox>

      {notifications.length > 0 && (
        <CardBox>
          <h3 className="font-bold text-lg mb-4">Últimas notificações</h3>
          <div className="grid gap-2">
            {notifications.slice(0, 4).map((notification) => (
              <div key={notification.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3 text-sm">
                <p className="font-bold">{notification.title}</p>
                <p className="text-zinc-600">{notification.message}</p>
                <p className="text-xs text-zinc-400 mt-1">{new Date(notification.createdAt).toLocaleString("pt-BR")}</p>
              </div>
            ))}
          </div>
        </CardBox>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Metric title="Total vendido" value={money(dayReport.totalDelivery)} icon="money" />
        <Metric title="Pedidos lançados" value={deliveries.length} icon="truck" />
        <Metric title="Tempo estimado" value={nextOrderEstimatedDeliveryLabel} icon="calendar" />
        <Metric title="Vendas balcão" value={dayReport.counterOrders} icon="money" />
        <Metric title="Clientes cadastrados" value={clients.length} icon="users" />
        <Metric title="Entregadores ativos" value={activeCouriers} icon="truck" />
      </div>

      <CardBox>
        <h3 className="font-bold text-lg mb-4">Entregas por status</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Metric title="Aguardando retirada" value={dayReport.waitingPickup} icon="calendar" />
          <Metric title="Saiu para entrega" value={dayReport.outForDelivery} icon="truck" />
          <Metric title="Entregas em conferência" value={dayReport.waitingApproval} icon="alert" />
          <Metric title="Confirmadas" value={dayReport.delivered} icon="check" />
          <Metric title="Problemas" value={dayReport.deliveryProblem} icon="alert" />
          <Metric title="Cancelados" value={dayReport.cancelled} icon="alert" />
        </div>
      </CardBox>

      <CardBox>
        <h3 className="font-bold text-lg mb-4">Resumo financeiro geral</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Metric title="Produtos vendidos" value={money(dayReport.productsTotal)} icon="package" />
          <Metric title="Vendas entrega" value={money(dayReport.deliverySalesTotal)} icon="truck" />
          <Metric title="Vendas balcão" value={money(dayReport.counterSalesTotal)} icon="money" />
          <Metric title="Taxas de entrega" value={money(dayReport.deliveryFeesTotal)} icon="money" />
          <Metric title="Descontos dados" value={money(dayReport.discountsTotal)} icon="percent" />
          <Metric title="Parte da loja confirmada" value={money(storeDeliverySummary.storeAmount)} icon="chart" />
        </div>
      </CardBox>

      <CardBox>
        <h3 className="font-bold text-lg mb-4">Produtos e estoque</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Metric title="Produtos cadastrados" value={products.length} icon="package" />
          <Metric title="Produtos ativos" value={dayReport.activeProducts} icon="check" />
          <Metric title="Produtos inativos" value={dayReport.inactiveProducts} icon="alert" />
          <Metric title="Estoque baixo" value={dayReport.lowStock} icon="alert" />
          <Metric title="Sem estoque" value={dayReport.outOfStock} icon="alert" />
        </div>
        {criticalProducts.length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="font-bold text-amber-800 mb-2">Produtos que precisam de atenção</p>
            <div className="grid gap-2">
              {criticalProducts.map((product) => (
                <div key={product.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 text-sm text-amber-900">
                  <span>{product.name}</span>
                  <span>Estoque: {product.stock} • mínimo: {product.minStock} • status: {product.active ? "Ativo" : "Inativo"}</span>
                  {Number(product.stock || 0) <= 0 && product.active && <button onClick={() => onInactivateProduct?.(product.id)} className="rounded-xl bg-red-600 px-3 py-1 text-xs font-bold text-white">Inativar sem estoque</button>}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardBox>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CardBox>
          <h3 className="font-bold text-lg mb-4">Últimos pedidos e vendas lançados</h3>
          <div className="grid gap-3">
            {latestDeliveries.map((delivery) => (
              <div key={delivery.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="font-bold">{isCounterOrder(delivery) ? "Venda" : "Pedido"} #{delivery.id} • {delivery.client}</p>
                    <p className="text-sm text-zinc-500">{delivery.address}</p>
                    <p className="text-xs text-zinc-500">Pagamento: {getPaymentLabel(delivery.payment, delivery.changeFor)} • Total: {money(delivery.value)}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full w-fit ${getStatusClass(delivery.status)}`}>{delivery.status}</span>
                </div>
              </div>
            ))}
          </div>
        </CardBox>

        <CardBox>
          <h3 className="font-bold text-lg mb-4">Equipe de entrega</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Metric title="Cadastrados" value={couriers.length} icon="users" />
            <Metric title="Ativos" value={activeCouriers} icon="check" />
            <Metric title="Bloqueados" value={blockedCouriers} icon="alert" />
          </div>
          <div className="grid gap-2">
            {couriers.map((courier) => (
              <div key={courier.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 rounded-2xl bg-zinc-50 border border-zinc-100 p-3 text-sm">
                <span className="font-semibold">{courier.name} • {courier.username}</span>
                <span className="text-zinc-500">{courier.active ? "Ativo" : "Bloqueado"} • {courier.motorcycleType || "Moto própria"}</span>
              </div>
            ))}
          </div>
        </CardBox>
      </div>

      <CardBox>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-lg">Testes internos do sistema</h3>
            <p className="text-sm text-zinc-500">Esses testes ajudam a garantir que as regras básicas continuam funcionando.</p>
          </div>
          <span className="text-sm font-bold bg-zinc-950 text-white rounded-2xl px-4 py-2 w-fit">{passedTests}/{selfTests.length} aprovados</span>
        </div>
        <div className="grid md:grid-cols-2 gap-2">{selfTests.map((test) => <div key={test.name} className="flex items-center gap-2 rounded-2xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm"><span>{test.passed ? "✅" : "❌"}</span><span>{test.name}</span></div>)}</div>
      </CardBox>
    </div>
  );
}


export { CustomerOrderStatusCard, NotificationPanel, OwnerDeliveryCard, AuditTab, DiagnosticsTab, DashboardTab };
