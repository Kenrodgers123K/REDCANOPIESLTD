const express = require('express'), fs = require('fs'), path = require('path');
const app = express(); app.use(express.json({ limit: '6mb' }));
const SITE = process.env.SITE_URL || 'https://redcanopies.co.ke', POCHI = '0143300853';
const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(path.join(DATA, 'uploads'), { recursive: true });
const rd = (n, d) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, n))); } catch { return d; } };
const wr = (n, v) => fs.writeFileSync(path.join(DATA, n), JSON.stringify(v, null, 2));
const CATS = { stainless: 'Stainless steel fittings', pneumatic: 'Pneumatic fittings', steam: 'Steam & boiler fittings', welding: 'Welding rods', ppe: 'Safety & PPE' };
// Placeholder prices (KES). Edit them in /admin after deploying.
const DEFAULTS = [
  ['ss-elbow-316', 'stainless', '316 Stainless Elbow 90°', '1/2" to 2" BSP threaded', 450], ['ss-tee-304', 'stainless', '304 Stainless Tee', '1/2" to 2" BSP threaded', 520],
  ['ss-triclover', 'stainless', 'Tri-Clover Clamp & Ferrule Set', '1.5" and 2", food grade 316', 1800], ['ss-nipple', 'stainless', 'Stainless Hex Nipple', '304, 1/4" to 1"', 280],
  ['pn-push-fit', 'pneumatic', 'Push-in Straight Fitting', '6 mm / 8 mm / 10 mm tube', 180], ['pn-coupler', 'pneumatic', 'Quick Air Coupler Set', '1/4" BSP, steel, 5 pcs', 950],
  ['pn-frl', 'pneumatic', 'Air Filter Regulator Lubricator', '1/2" port, 0-10 bar', 6500], ['st-ball-valve', 'steam', 'Steam Ball Valve', 'PN16, 1/2" to 2" flanged', 3800],
  ['st-trap', 'steam', 'Thermodynamic Steam Trap', '1/2" to 1", cast steel', 4200], ['st-gauge', 'steam', 'Boiler Pressure Gauge', '0-16 bar, 100 mm dial', 2100],
  ['wd-6013', 'welding', 'Mild Steel Rods E6013', '3.2 mm, 5 kg pack', 1900], ['wd-316l', 'welding', 'Stainless Rods E316L-16', '2.5 mm, 1 kg pack', 2400],
  ['pe-gloves', 'ppe', 'Welding Gloves', 'Leather, heat resistant, pair', 650], ['pe-boots', 'ppe', 'Steel-toe Safety Boots', 'Sizes 38 to 46', 3200],
  ['pe-helmet', 'ppe', 'Auto-darkening Welding Helmet', 'DIN 9-13', 4800]
].map(([id, cat, name, spec, price]) => ({ id, cat, name, spec, price }));
const products = () => { let p = rd('products.json', null); if (!p) { p = DEFAULTS; wr('products.json', p); } return p; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ldj = o => JSON.stringify(o).replace(/</g, '\\u003c');
const img = (p, big) => p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" width="${big ? 600 : 72}" height="${big ? 600 : 72}">` : `<div class="ph" aria-hidden="true">${esc(p.name.slice(0, 2))}</div>`;
const offer = p => ({ '@type': 'Offer', priceCurrency: 'KES', price: p.price, availability: 'https://schema.org/InStock', url: `${SITE}/product/${p.id}` });

function home() {
  const list = products();
  const html = Object.entries(CATS).map(([k, label]) => `<section id="${k}" class="cat"><h2>${label}</h2>` + list.filter(p => p.cat === k).map(p => `
  <article class="card">${img(p)}<div><h3><a href="/product/${esc(p.id)}">${esc(p.name)}</a></h3><p class="spec">${esc(p.spec)}</p></div>
  <div class="row"><span>KES <b>${p.price}</b></span><button class="add" data-id="${esc(p.id)}">Add to cart</button></div></article>`).join('') + `</section>`).join('');
  const ld = [{ '@context': 'https://schema.org', '@type': 'LocalBusiness', name: 'Red Canopies Ltd', url: SITE, email: 'info@redcanopies.co.ke', telephone: '+254143300853',
    description: 'Stainless steel, pneumatic, steam and boiler fittings, welding rods and PPE in Nairobi.', address: { '@type': 'PostalAddress', streetAddress: 'Industrial Area', addressLocality: 'Nairobi', addressCountry: 'KE' } },
    { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: list.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/product/${p.id}` })) }];
  return fs.readFileSync(path.join(__dirname, 'public/index.html'), 'utf8').replace('{{SITE}}', SITE).replace('{{LD}}', ld.map(ldj).join('</script><script type="application/ld+json">'))
    .replace('{{CATALOGUE}}', html).replace('{{DATA}}', ldj(list.map(({ id, name, price }) => ({ id, name, price }))));
}
app.get('/', (_, r) => r.type('html').send(home()));
app.get('/product/:id', (q, r) => {
  const p = products().find(x => x.id === q.params.id); if (!p) return r.status(404).send('Product not found');
  const ld = { '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: `${p.name}, ${p.spec}. Sold by Red Canopies Ltd, Nairobi.`, category: CATS[p.cat], brand: { '@type': 'Brand', name: 'Red Canopies Ltd' }, offers: offer(p) };
  if (p.image) ld.image = SITE + p.image;
  r.type('html').send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.name)} | Red Canopies Ltd Nairobi</title><meta name="description" content="Buy ${esc(p.name)} (${esc(p.spec)}) in Nairobi for KES ${p.price}. Pay with M-Pesa.">
<link rel="canonical" href="${SITE}/product/${esc(p.id)}"><link rel="stylesheet" href="/style.css"><script type="application/ld+json">${ldj(ld)}</script></head><body>
<header><div class="w"><a class="logo" href="/">RED<b>CANOPIES</b></a><nav><a href="/#${p.cat}">${CATS[p.cat]}</a></nav></div></header>
<main class="w"><div class="pd">${img(p, true)}<div><p><a href="/#${p.cat}">${CATS[p.cat]}</a></p><h1>${esc(p.name)}</h1><p class="spec">${esc(p.spec)}</p>
<p style="font-size:1.6rem"><b>KES ${p.price}</b></p><a class="btn" href="/?add=${esc(p.id)}">Add to cart</a>
<p>Pay with M-Pesa. Delivery across Kenya. Need a bulk price? Email <a href="mailto:info@redcanopies.co.ke">info@redcanopies.co.ke</a>.</p></div></div></main></body></html>`);
});
app.get('/robots.txt', (_, r) => r.type('text').send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nSitemap: ${SITE}/sitemap.xml`));
app.get('/sitemap.xml', (_, r) => r.type('xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
  ['/', ...products().map(p => '/product/' + p.id)].map(u => `<url><loc>${SITE}${u}</loc><changefreq>weekly</changefreq></url>`).join('') + `</urlset>`));
app.use('/uploads', express.static(path.join(DATA, 'uploads'), { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.get('/admin', (_, r) => r.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/api/products', (_, r) => r.json(products()));

const phone = p => { p = String(p).replace(/\D/g, ''); return /^0[17]\d{8}$/.test(p) ? '254' + p.slice(1) : /^254[17]\d{8}$/.test(p) ? p : null; };
// Marks an order paid when a forwarded M-Pesa SMS matches its code and covers its total.
function reconcile(o) { const pay = rd('payments.json', []).find(x => x.code === o.mpesaCode); if (pay && pay.amount >= o.total) o.status = 'paid'; }

app.post('/api/orders', async (req, res) => {
  const { name, phone: ph, address, items, method } = req.body || {}, tel = phone(ph), list = products();
  if (!name || !address || !tel || !Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Enter your name, a valid M-Pesa phone number, delivery address and at least one item.' });
  let total = 0; const lines = [];
  for (const i of items) { const p = list.find(x => x.id === i.id), q = Math.min(Math.max(parseInt(i.qty) || 0, 0), 999); if (p && q) { lines.push({ id: p.id, name: p.name, price: p.price, qty: q }); total += p.price * q; } }
  if (!lines.length) return res.status(400).json({ error: 'Your cart is empty.' });
  const orders = rd('orders.json', []), ref = 'RC' + Date.now().toString(36).toUpperCase();
  const order = { ref, name: String(name).slice(0, 80), phone: tel, address: String(address).slice(0, 200), lines, total, status: 'awaiting-payment', created: new Date().toISOString() };
  orders.push(order); let stk = false;
  if (method === 'stk' && process.env.DARAJA_KEY) { try { order.checkoutId = await stkPush(tel, total, ref); stk = true; } catch (e) { console.error(e.message); } }
  wr('orders.json', orders); res.json({ ref, total, pochi: POCHI, stk });
});
app.post('/api/orders/:ref/code', (req, res) => {
  const orders = rd('orders.json', []), o = orders.find(x => x.ref === req.params.ref), code = String(req.body.code || '').trim().toUpperCase();
  if (!o || !/^[A-Z0-9]{8,12}$/.test(code)) return res.status(400).json({ error: 'Enter the M-Pesa confirmation code from your SMS.' });
  o.mpesaCode = code; if (o.status !== 'paid') { o.status = 'payment-submitted'; reconcile(o); } wr('orders.json', orders); res.json({ ok: true, paid: o.status === 'paid' });
});
// Auto-verify Pochi: forward M-Pesa SMS from your phone (e.g. "SMS Forwarder" app) to POST /api/sms?key=SMS_KEY with JSON {"text":"..."}
app.post('/api/sms', (req, res) => {
  if (!process.env.SMS_KEY || req.query.key !== process.env.SMS_KEY) return res.sendStatus(401);
  const t = String(req.body.text || req.body.message || ''), code = (t.match(/\b([A-Z0-9]{10})\s+Confirmed/i) || [])[1], amt = (t.match(/Ksh\.?\s?([\d,]+(?:\.\d+)?)/i) || [])[1];
  if (!code || !amt) return res.json({ ok: false });
  const pays = rd('payments.json', []); if (!pays.find(x => x.code === code.toUpperCase())) pays.push({ code: code.toUpperCase(), amount: parseFloat(amt.replace(/,/g, '')), at: new Date().toISOString() });
  wr('payments.json', pays); const orders = rd('orders.json', []); orders.filter(o => o.mpesaCode && o.status !== 'paid').forEach(reconcile); wr('orders.json', orders); res.json({ ok: true });
});
async function stkPush(tel, amount, ref) {
  const base = process.env.DARAJA_ENV === 'live' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke', sc = process.env.DARAJA_SHORTCODE;
  const auth = Buffer.from(process.env.DARAJA_KEY + ':' + process.env.DARAJA_SECRET).toString('base64');
  const { access_token } = await (await fetch(base + '/oauth/v1/generate?grant_type=client_credentials', { headers: { Authorization: 'Basic ' + auth } })).json();
  const ts = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const r = await (await fetch(base + '/mpesa/stkpush/v1/processrequest', { method: 'POST', headers: { Authorization: 'Bearer ' + access_token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ BusinessShortCode: sc, Password: Buffer.from(sc + process.env.DARAJA_PASSKEY + ts).toString('base64'), Timestamp: ts, TransactionType: 'CustomerPayBillOnline',
      Amount: amount, PartyA: tel, PartyB: sc, PhoneNumber: tel, CallBackURL: process.env.DARAJA_CALLBACK, AccountReference: ref, TransactionDesc: 'Red Canopies order' }) })).json();
  if (!r.CheckoutRequestID) throw new Error(JSON.stringify(r)); return r.CheckoutRequestID;
}
app.post('/api/mpesa/callback', (req, res) => {
  const cb = req.body?.Body?.stkCallback, orders = rd('orders.json', []), o = orders.find(x => x.checkoutId === cb?.CheckoutRequestID);
  if (o) { if (cb.ResultCode === 0) { o.status = 'paid'; o.mpesaCode = (cb.CallbackMetadata?.Item || []).find(i => i.Name === 'MpesaReceiptNumber')?.Value; } else o.status = 'payment-failed'; wr('orders.json', orders); }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

const adm = (q, r, n) => process.env.ADMIN_KEY && q.get('x-admin-key') === process.env.ADMIN_KEY ? n() : r.sendStatus(401);
app.get('/api/admin/orders', adm, (_, r) => r.json(rd('orders.json', []).reverse()));
app.post('/api/admin/orders/:ref/status', adm, (q, r) => {
  const orders = rd('orders.json', []), o = orders.find(x => x.ref === q.params.ref);
  if (!o || !['awaiting-payment', 'payment-submitted', 'paid', 'dispatched', 'delivered', 'cancelled'].includes(q.body.status)) return r.sendStatus(400);
  o.status = q.body.status; wr('orders.json', orders); r.json({ ok: true });
});
const clean = b => ({ name: String(b.name || '').slice(0, 100), spec: String(b.spec || '').slice(0, 150), price: Math.max(0, Math.round(Number(b.price) || 0)), cat: CATS[b.cat] ? b.cat : 'stainless' });
app.post('/api/admin/products', adm, (q, r) => {
  const list = products(), c = clean(q.body); if (!c.name) return r.sendStatus(400);
  let id = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'item'; while (list.find(p => p.id === id)) id += '-2';
  list.push({ id, ...c }); wr('products.json', list); r.json({ id });
});
app.put('/api/admin/products/:id', adm, (q, r) => { const list = products(), p = list.find(x => x.id === q.params.id); if (!p) return r.sendStatus(404); Object.assign(p, clean(q.body)); wr('products.json', list); r.json({ ok: true }); });
app.delete('/api/admin/products/:id', adm, (q, r) => { wr('products.json', products().filter(x => x.id !== q.params.id)); r.json({ ok: true }); });
app.post('/api/admin/products/:id/image', adm, (q, r) => {
  const list = products(), p = list.find(x => x.id === q.params.id), m = /^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(String(q.body.data || ''));
  if (!p || !m) return r.status(400).json({ error: 'Upload a PNG, JPG or WEBP image.' });
  const name = `${p.id}-${Date.now()}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`; fs.writeFileSync(path.join(DATA, 'uploads', name), Buffer.from(m[2], 'base64'));
  p.image = '/uploads/' + name; wr('products.json', list); r.json({ image: p.image });
});
app.listen(process.env.PORT || 3000, () => console.log('Red Canopies running'));
