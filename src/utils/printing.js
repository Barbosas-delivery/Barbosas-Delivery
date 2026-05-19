import { escapeHtml } from "./formatters";

function buildThermalHtml(title, bodyHtml, copies = 1, options = {}) {
  const safeCopies = Math.max(1, Number(copies || 1));
  const copyBlocks = Array.from({ length: safeCopies }, (_, index) => `
    <section class="receipt-copy">
      ${safeCopies > 1 ? `<p class="copy-title">VIA ${index + 1}/${safeCopies}</p>` : ""}
      ${bodyHtml}
    </section>
  `).join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; background: #fff; color: #000; width: 72mm; max-width: 72mm; overflow: hidden; }
          body { font-family: Arial, Helvetica, sans-serif; font-size: ${options.delivery ? "14px" : "13px"}; font-weight: 500; }
          .receipt-copy { width: 72mm; max-width: 72mm; padding: 2mm 1mm 6mm; page-break-after: always; }
          .receipt-copy:last-child { page-break-after: auto; }
          h1 { font-size: ${options.delivery ? "24px" : "21px"}; margin: 0 0 3mm; text-align: center; letter-spacing: .5px; font-weight: 900; }
          .brand { font-size: 26px; border: 2px solid #000; padding: 3mm 1mm; }
          .copy-title { text-align: center; font-weight: 900; font-size: 15px; margin: 0 0 2mm; }
          p { margin: 1.7mm 0; line-height: 1.28; overflow-wrap: anywhere; }
          .muted { text-align: center; font-size: 13px; }
          .center { text-align: center; }
          .thanks { font-size: 15px; font-weight: 900; }
          .line { border-top: 1px dashed #000; margin: 2.7mm 0; }
          table { width: 100%; max-width: 72mm; border-collapse: collapse; font-size: ${options.delivery ? "12px" : "11px"}; }
          th, td { padding: 1.2mm 0; border-bottom: 1px dotted #aaa; vertical-align: top; text-align: left; }
          th:last-child, td:last-child { text-align: right; }
          .total { font-size: ${options.delivery ? "22px" : "19px"}; font-weight: 900; text-align: right; margin-top: 2mm; }
          .big { font-size: 18px; font-weight: 900; }
        </style>
      </head>
      <body>${copyBlocks}</body>
    </html>
  `;
}

function sendToLocalPrintService(title, html, copies, options = {}) {
  const config = options.localPrintService || {};
  const endpoint = String(config.url || "").trim();
  if (!endpoint) return false;

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutMs = Math.min(15000, Math.max(1000, Number(config.timeoutMs || 5000)));
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app: "barbosas-delivery",
      title,
      html,
      copies,
      widthMm: 80,
      createdAt: new Date().toISOString(),
    }),
    signal: controller?.signal,
  })
    .then((response) => {
      if (!response.ok) throw new Error(`Serviço local retornou HTTP ${response.status}`);
      options.onLocalPrintSuccess?.();
    })
    .catch((error) => {
      console.error("Erro ao enviar para serviço local de impressão:", error);
      options.onLocalPrintError?.(error);
    })
    .finally(() => {
      if (timeoutId) clearTimeout(timeoutId);
    });

  return true;
}

export function printThermalHtml(title, bodyHtml, copies = 1, options = {}) {
  const safeCopies = Math.max(1, Number(copies || 1));
  const html = buildThermalHtml(title, bodyHtml, safeCopies, options);
  const localServiceEnabled = options.localPrintService?.enabled === true;
  const useBrowserFallback = options.localPrintService?.fallbackToBrowser !== false;

  if (localServiceEnabled && sendToLocalPrintService(title, html, safeCopies, options)) {
    if (!useBrowserFallback) return true;
  }

  const printWindow = options.printWindow || window.open("about:blank", "_blank", "width=420,height=760");

  if (!printWindow) {
    options.onBlocked?.();
    return false;
  }

  try {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      try {
        printWindow.print();
        const closeDelaySeconds = Number(options.closeAfterPrintSeconds || 0);
        if (closeDelaySeconds > 0) {
          setTimeout(() => {
            try {
              printWindow.close();
            } catch (error) {
              console.error("Erro ao fechar janela de impressão:", error);
            }
          }, closeDelaySeconds * 1000);
        }
      } catch (error) {
        console.error("Erro ao imprimir:", error);
      }
    }, 300);
    return true;
  } catch (error) {
    console.error("Erro ao preparar impressão:", error);
    options.onError?.(error);
    return false;
  }
}
