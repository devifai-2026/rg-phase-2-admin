// Opens a clean, printable invoice in a new window (print → save as PDF).
// Renders with the admin's invoice template (businessName, logo, address,
// GSTIN, footer + one of 3 designs). The template is passed by the caller —
// the Orders tab gets it from the populated invoice (`invoice.template`).
const rupees = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

// Per-design palette + small style hooks. Falls back to Classic.
const DESIGNS = {
  1: { name: 'classic', accent: '#C8392B', ink: '#17181d', soft: '#6b6e76', headerBorder: '3px solid #C8392B', bg: '#ffffff', motif: '' },
  2: { name: 'modern', accent: '#B8860B', ink: '#1c1c1c', soft: '#7a7d85', headerBorder: '1px solid #e8e2d2', bg: '#ffffff', motif: '' },
  3: { name: 'devotional', accent: '#A0522D', ink: '#3a2a1a', soft: '#8a7a66', headerBorder: '2px solid #d8c4a0', bg: '#fbf6ef', motif: 'ॐ' },
};

export function printInvoice(inv, template) {
  const w = window.open('', '_blank', 'width=820,height=920');
  if (!w) return;

  const tpl = template || inv?.template || {};
  const d = DESIGNS[Number(tpl.design)] || DESIGNS[1];
  const businessName = tpl.businessName || 'Rudraganga';
  const bizAddr = [tpl.addressLine1, tpl.addressLine2, [tpl.city, tpl.state, tpl.pincode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const bizContact = [tpl.phone, tpl.email].filter(Boolean).join(' · ');

  const rows = (inv.items || []).map(
    (it) => `<tr><td>${esc(it.name)}</td><td style="text-align:center">${esc(it.qty)}</td><td style="text-align:right">${rupees(it.unitPrice)}</td><td style="text-align:right">${rupees(it.lineTotal)}</td></tr>`
  ).join('');
  const addr = inv.billTo || {};
  const billLines = [addr.line1, addr.line2, [addr.city, addr.state, addr.pincode].filter(Boolean).join(' ')].filter(Boolean).join(', ');

  // Header: logo (if any) + business identity on the left, invoice meta on right.
  const logoHtml = tpl.logo
    ? `<img src="${esc(tpl.logo)}" alt="logo" style="height:54px;width:54px;border-radius:10px;object-fit:cover;margin-right:12px" />`
    : (d.motif ? `<div class="motif">${d.motif}</div>` : '');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(inv.invoiceNo)}</title>
  <style>
    *{box-sizing:border-box;font-family:-apple-system,Segoe UI,Roboto,sans-serif}
    body{margin:0;padding:40px;color:${d.ink};background:${d.bg}}
    .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:${d.headerBorder};padding-bottom:16px}
    .ident{display:flex;align-items:center}
    .motif{height:54px;width:54px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:30px;color:${d.accent};background:${d.accent}14;margin-right:12px}
    .brand{font-size:24px;font-weight:800;color:${d.ink}}
    .biz{font-size:12px;color:${d.soft};margin-top:2px;max-width:320px;line-height:1.4}
    .gst{font-size:11px;color:${d.soft};margin-top:3px}
    .muted{color:${d.soft};font-size:13px}
    .inv-no{font-weight:700;color:${d.accent}}
    h1{font-size:15px;letter-spacing:1px;text-transform:uppercase;color:${d.soft};margin:24px 0 4px}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th,td{padding:9px 8px;font-size:13px;border-bottom:1px solid ${d.name === 'devotional' ? '#e7dcc8' : '#eee'}}
    th{text-align:left;color:${d.soft};font-size:11px;text-transform:uppercase;letter-spacing:.5px;background:${d.accent}0d}
    .totals{margin-top:16px;margin-left:auto;width:280px}
    .totals .row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px}
    .totals .grand{border-top:2px solid ${d.ink};margin-top:6px;padding-top:8px;font-weight:800;font-size:15px}
    .grand .amt{color:${d.accent}}
    .footer{margin-top:44px;text-align:center;color:${d.soft};font-size:12px;border-top:1px solid ${d.accent}22;padding-top:14px}
    @media print{body{padding:24px;background:${d.bg};-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
    <div class="top">
      <div class="ident">
        ${logoHtml}
        <div>
          <div class="brand">${esc(businessName)}</div>
          ${bizAddr ? `<div class="biz">${esc(bizAddr)}</div>` : '<div class="biz">Astrology &amp; Wellness</div>'}
          ${bizContact ? `<div class="biz">${esc(bizContact)}</div>` : ''}
          ${tpl.gstin ? `<div class="gst">GSTIN: ${esc(tpl.gstin)}</div>` : ''}
        </div>
      </div>
      <div style="text-align:right">
        <div class="inv-no">${esc(inv.invoiceNo)}</div>
        <div class="muted">${new Date(inv.issuedAt || inv.createdAt || Date.now()).toLocaleDateString('en-IN')}</div>
      </div>
    </div>
    <h1>Bill To</h1>
    <div>${esc(addr.name || '')}<br><span class="muted">${esc(billLines)}<br>${esc(addr.phone || '')}</span></div>
    <h1>Items</h1>
    <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${rupees(inv.subtotal)}</span></div>
      ${inv.discount ? `<div class="row"><span>Discount${inv.couponCode ? ' (' + esc(inv.couponCode) + ')' : ''}</span><span>− ${rupees(inv.discount)}</span></div>` : ''}
      <div class="row grand"><span>Total Paid</span><span class="amt">${rupees(inv.total)}</span></div>
    </div>
    <div class="footer">${esc(tpl.footerNote || 'Thank you for shopping with Rudraganga')}${inv.paymentId ? ' · Ref ' + esc(inv.paymentId) : ''}</div>
    <script>window.onload=function(){window.print()}</script>
  </body></html>`;
  w.document.write(html);
  w.document.close();
}
