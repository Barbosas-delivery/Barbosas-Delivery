import { escapeHtml } from "./formatters";

export function printThermalHtml(title, bodyHtml, copies = 1, options = {}) {
  const printWindow = options.printWindow || window.open("about:blank", "_blank", "width=420,height=760");

  if (!printWindow) {
    options.onBlocked?.();
    return false;
  }

  const safeCopies = Math.max(1, Number(copies || 1));
  const copyBlocks = Array.from({ length: safeCopies }, (_, index) => `
    <section class="receipt-copy">
      ${safeCopies > 1 ? `<p class="copy-title">VIA ${index + 1}/${safeCopies}</p>` : ""}
      ${bodyHtml}
    </section>
  `).join("");

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: 80mm auto; margin: 3mm; }
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; background: #fff; color: #000; }
          body { width: 76mm; font-family: Arial, Helvetica, sans-serif; font-size: ${options.delivery ? "15px" : "14px"}; font-weight: 500; }
          .receipt-copy { padding: 2mm 1mm 6mm; page-break-after: always; }
          .receipt-copy:last-child { page-break-after: auto; }
          h1 { font-size: ${options.delivery ? "24px" : "21px"}; margin: 0 0 3mm; text-align: center; letter-spacing: .5px; font-weight: 900; }
          .brand { font-size: 26px; border: 2px solid #000; padding: 3mm 1mm; }
          .copy-title { text-align: center; font-weight: 900; font-size: 15px; margin: 0 0 2mm; }
          p { margin: 1.7mm 0; line-height: 1.28; }
          .muted { text-align: center; font-size: 13px; }
          .center { text-align: center; }
          .thanks { font-size: 15px; font-weight: 900; }
          .line { border-top: 1px dashed #000; margin: 2.7mm 0; }
          table { width: 100%; border-collapse: collapse; font-size: ${options.delivery ? "13px" : "12px"}; }
          th, td { padding: 1.2mm 0; border-bottom: 1px dotted #aaa; vertical-align: top; text-align: left; }
          th:last-child, td:last-child { text-align: right; }
          .total { font-size: ${options.delivery ? "22px" : "19px"}; font-weight: 900; text-align: right; margin-top: 2mm; }
          .big { font-size: 18px; font-weight: 900; }
        </style>
      </head>
      <body>${copyBlocks}</body>
    </html>
  `;

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
