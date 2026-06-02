// Print helper that renders a clean, standalone document in a new window —
// produces an actual invoice/receipt, not a screenshot of the app page.

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function openAndPrint(title, bodyHtml, widthCss) {
  const w = window.open('', '_blank', 'width=420,height=640');
  if (!w) {
    alert('Please allow pop-ups to print.');
    return;
  }
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"/>
<title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, "Segoe UI", sans-serif; color: #111; margin: 0; padding: 16px; ${widthCss} }
  h1 { font-size: 20px; margin: 0 0 2px; }
  .muted { color: #666; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0; }
  th, td { padding: 6px 4px; font-size: 13px; }
  thead th { border-bottom: 2px solid #333; text-align: left; }
  tbody td { border-bottom: 1px solid #ddd; }
  .r { text-align: right; }
  .c { text-align: center; }
  .totals { margin-left: auto; width: 60%; }
  .totals td { border: none; padding: 2px 4px; }
  .grand { font-size: 16px; font-weight: bold; border-top: 2px solid #333; }
  .hdr { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .biz { font-weight: bold; font-size: 16px; }
  @media print { body { padding: 0; } @page { margin: 8mm; } }
</style></head><body>${bodyHtml}
<script>window.onload=function(){window.focus();window.print();setTimeout(function(){window.close();},300);};<\/script>
</body></html>`);
  w.document.close();
}

// Full A4-style invoice. `fmt` is a currency formatter (number -> string).
export function printInvoice({ invoice, settings, fmt, t, partyName, partyPhone }) {
  const s = settings || {};
  const items = (invoice.items || []).map((it) => `
    <tr>
      <td>${esc(it.product?.name_en || it.product?.name || it.product?.name_ar || '-')}</td>
      <td class="c">${esc(it.quantity)}</td>
      <td class="r">${esc(fmt(it.unit_price))}</td>
      <td class="r">${esc(fmt(it.total))}</td>
    </tr>`).join('');

  const remaining = Math.max(0, (parseFloat(invoice.total) || 0) - (parseFloat(invoice.paid_amount) || 0));
  const body = `
    <div class="hdr">
      <div>
        <div class="biz">${esc(s.business_name || 'Invoice')}</div>
        ${s.business_phone ? `<div class="muted">${esc(s.business_phone)}</div>` : ''}
        ${s.business_address ? `<div class="muted">${esc(s.business_address)}</div>` : ''}
        ${s.tax_id ? `<div class="muted">${esc(t('tax_id') || 'Tax ID')}: ${esc(s.tax_id)}</div>` : ''}
      </div>
      <div class="r">
        <h1>${esc(t('invoice') || 'Invoice')}</h1>
        <div class="muted">${esc(invoice.invoice_number)}</div>
        <div class="muted">${esc(invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : '')}</div>
      </div>
    </div>
    <div style="margin-bottom:8px;">
      <strong>${esc(invoice.type === 'sale' ? (t('customer') || 'Customer') : (t('supplier') || 'Supplier'))}:</strong>
      ${esc(partyName || '-')}${partyPhone ? ' · ' + esc(partyPhone) : ''}
    </div>
    <table>
      <thead><tr>
        <th>${esc(t('products') || 'Product')}</th>
        <th class="c">${esc(t('quantity') || 'Qty')}</th>
        <th class="r">${esc(t('unit_price') || 'Price')}</th>
        <th class="r">${esc(t('total') || 'Total')}</th>
      </tr></thead>
      <tbody>${items}</tbody>
    </table>
    <table class="totals">
      <tr><td>${esc(t('subtotal') || 'Subtotal')}</td><td class="r">${esc(fmt(invoice.subtotal))}</td></tr>
      ${invoice.tax_amount ? `<tr><td>${esc(t('tax') || 'Tax')}</td><td class="r">${esc(fmt(invoice.tax_amount))}</td></tr>` : ''}
      ${invoice.discount_amount ? `<tr><td>${esc(t('discount') || 'Discount')}</td><td class="r">-${esc(fmt(invoice.discount_amount))}</td></tr>` : ''}
      <tr class="grand"><td>${esc(t('total') || 'Total')}</td><td class="r">${esc(fmt(invoice.total))}</td></tr>
      <tr><td>${esc(t('paid') || 'Paid')}</td><td class="r">${esc(fmt(invoice.paid_amount))}</td></tr>
      <tr><td>${esc(t('remaining') || 'Remaining')}</td><td class="r">${esc(fmt(remaining))}</td></tr>
    </table>
    ${invoice.notes ? `<p class="muted">${esc(t('notes') || 'Notes')}: ${esc(invoice.notes)}</p>` : ''}
  `;
  openAndPrint(invoice.invoice_number || (t('invoice') || 'Invoice'), body, 'max-width: 800px; margin: 0 auto;');
}

// Barcode label sheet — a clean printable document (not a page screenshot).
export function printLabels({ products, fmt, t }) {
  const cards = (products || []).map((p) => `
    <div class="label">
      <div class="name">${esc(p.name_en || p.name || p.name_ar || '-')}</div>
      ${p.barcode ? `<div class="code">${esc(p.barcode)}</div>` : ''}
      ${p.sku ? `<div class="sku">SKU: ${esc(p.sku)}</div>` : ''}
      <div class="price">${esc(fmt(p.sell_price))}</div>
    </div>`).join('');
  const body = `
    <style>
      body { padding: 8px; }
      .sheet { display: flex; flex-wrap: wrap; gap: 8px; }
      .label { width: 48%; box-sizing: border-box; border: 1px dashed #bbb; border-radius: 6px;
               padding: 8px; text-align: center; page-break-inside: avoid; }
      .name { font-weight: bold; font-size: 14px; }
      .code { font-family: 'Libre Barcode 39', 'Courier New', monospace; font-size: 22px; letter-spacing: 4px; margin: 6px 0; }
      .sku { font-size: 11px; color: #666; }
      .price { font-size: 13px; margin-top: 4px; }
    </style>
    <div class="sheet">${cards}</div>`;
  openAndPrint(t('print_labels') || 'Labels', body, 'max-width: 800px; margin: 0 auto;');
}

// 80mm thermal receipt for POS sales.
export function printReceipt({ lines, settings, fmt, t, totals, paymentMethod }) {
  const s = settings || {};
  const rows = (lines || []).map((it) => `
    <tr>
      <td>${esc(it.name)}<div class="muted" style="font-size:11px;">${esc(it.quantity)} × ${esc(fmt(it.unit_price))}</div></td>
      <td class="r">${esc(fmt(it.line_total))}</td>
    </tr>`).join('');
  const body = `
    <div style="text-align:center;margin-bottom:6px;">
      <div class="biz">${esc(s.business_name || 'Receipt')}</div>
      ${s.business_phone ? `<div class="muted" style="font-size:11px;">${esc(s.business_phone)}</div>` : ''}
      ${s.business_address ? `<div class="muted" style="font-size:11px;">${esc(s.business_address)}</div>` : ''}
      <div class="muted" style="font-size:11px;">${esc(new Date().toLocaleString())}</div>
    </div>
    <table>
      <tbody>${rows}</tbody>
    </table>
    <table class="totals" style="width:100%;">
      <tr><td>${esc(t('subtotal') || 'Subtotal')}</td><td class="r">${esc(fmt(totals.subtotal))}</td></tr>
      ${totals.discount ? `<tr><td>${esc(t('discount') || 'Discount')}</td><td class="r">-${esc(fmt(totals.discount))}</td></tr>` : ''}
      ${totals.tax ? `<tr><td>${esc(t('tax') || 'Tax')}</td><td class="r">${esc(fmt(totals.tax))}</td></tr>` : ''}
      <tr class="grand"><td>${esc(t('total') || 'Total')}</td><td class="r">${esc(fmt(totals.total))}</td></tr>
      ${paymentMethod ? `<tr><td>${esc(t('payment_method') || 'Payment')}</td><td class="r">${esc(t(paymentMethod) || paymentMethod)}</td></tr>` : ''}
    </table>
    <p style="text-align:center;font-size:12px;margin-top:10px;">${esc(t('thank_you') || 'Thank you!')}</p>
  `;
  openAndPrint(t('receipt') || 'Receipt', body, 'max-width: 280px; margin: 0 auto;');
}
