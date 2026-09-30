// Storefront logic: loads store.json, renders the product, runs the cart, sends checkout to /api/checkout.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, attrs = {}, text) => { const n = document.createElement(tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text != null) n.textContent = text; return n; };
  let S = null, money = null;
  const CART_KEY = 'cart.v1';

  function readCart() { try { const c = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); return Array.isArray(c) ? c : []; } catch (e) { return []; } }
  function writeCart(c) { try { localStorage.setItem(CART_KEY, JSON.stringify(c)); } catch (e) {} renderCart(); }
  function variant(id) { return S.product.variants.find((v) => v.id === id); }
  function priceOf(v) { return v.priceCents ?? S.product.priceCents; }

  async function checkout(items, btn) {
    const msg = $('#msg') || $('#cartMsg');
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Loading…';
    if (msg) msg.textContent = '';
    try {
      const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.url) throw new Error(d.error || 'Checkout could not start. Please try again.');
      location.href = d.url;
    } catch (e) {
      const m = btn.id === 'cartCheckout' ? $('#cartMsg') : $('#msg');
      if (m) m.textContent = e.message;
      btn.disabled = false; btn.textContent = label;
    }
  }

  // ---------- cart drawer ----------
  function openCart() { $('#scrim').hidden = false; $('#drawer').hidden = false; $('#drawer .x').focus(); document.body.style.overflow = 'hidden'; }
  function closeCart() { $('#scrim').hidden = true; $('#drawer').hidden = true; document.body.style.overflow = ''; }
  function renderCart() {
    if (!S || !$('#lines')) return;
    const cart = readCart().filter((i) => variant(i.variantId));
    const count = cart.reduce((a, i) => a + i.qty, 0);
    document.querySelectorAll('.cart-count').forEach((n) => (n.textContent = count));
    const box = $('#lines'); box.innerHTML = '';
    if (!cart.length) box.appendChild(el('p', { class: 'empty' }, 'Your cart is empty.'));
    cart.forEach((i, idx) => {
      const v = variant(i.variantId);
      const row = el('div', { class: 'line' });
      const img = el('img', { src: S.product.image, alt: '' });
      const mid = el('div');
      mid.appendChild(el('div', { class: 'name' }, S.product.name));
      if (S.product.variants.length > 1) mid.appendChild(el('div', { class: 'var' }, S.product.optionName + ': ' + v.name));
      const q = el('div', { class: 'qty' });
      const minus = el('button', { type: 'button', 'aria-label': 'Decrease quantity' }, '−');
      const input = el('input', { type: 'number', min: '1', max: '10', value: String(i.qty), 'aria-label': 'Quantity' });
      const plus = el('button', { type: 'button', 'aria-label': 'Increase quantity' }, '+');
      const set = (n) => { const c = readCart(); c[idx].qty = Math.max(1, Math.min(10, n || 1)); writeCart(c); };
      minus.onclick = () => set(i.qty - 1); plus.onclick = () => set(i.qty + 1); input.onchange = () => set(parseInt(input.value, 10));
      q.append(minus, input, plus); mid.appendChild(q);
      const right = el('div', { class: 'right' });
      right.appendChild(el('div', {}, money.format(priceOf(v) * i.qty / 100)));
      const rm = el('button', { type: 'button', class: 'remove' }, 'Remove');
      rm.onclick = () => { const c = readCart(); c.splice(idx, 1); writeCart(c); };
      right.appendChild(rm);
      row.append(img, mid, right); box.appendChild(row);
    });
    const sub = cart.reduce((a, i) => a + priceOf(variant(i.variantId)) * i.qty, 0);
    $('#subtotal').textContent = money.format(sub / 100);
    $('#cartCheckout').disabled = !cart.length;
  }
  function addToCart(variantId, qty) {
    const c = readCart(); const hit = c.find((i) => i.variantId === variantId);
    if (hit) hit.qty = Math.min(10, hit.qty + qty); else c.push({ variantId, qty });
    writeCart(c); openCart();
  }

  // ---------- product page ----------
  function renderProduct() {
    const p = S.product;
    const root = $('#product'); if (!root) return;
    $('#pName').textContent = p.name;
    $('#pShort').textContent = p.shortDescription;
    const img = $('#pImg'); img.src = p.image; img.alt = p.imageAlt;
    img.onerror = () => { img.replaceWith(el('div', { class: 'missing' }, 'Add your product photo as public/images/product.jpg')); };
    const desc = $('#pDesc'); desc.innerHTML = ''; (p.description || []).forEach((t) => desc.appendChild(el('p', {}, t)));
    const feats = $('#pFeatures'); feats.innerHTML = ''; (p.features || []).forEach((t) => feats.appendChild(el('li', {}, t)));
    feats.hidden = !(p.features || []).length;

    let selected = p.variants[0].id;
    const vbox = $('#variants'); vbox.innerHTML = '';
    $('#optLabel').textContent = p.optionName;
    $('#variantField').hidden = p.variants.length < 2;
    const paint = () => {
      vbox.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === selected)));
      $('#pPrice').textContent = money.format(priceOf(variant(selected)) / 100);
    };
    p.variants.forEach((v) => { const b = el('button', { type: 'button', 'data-id': v.id, 'aria-pressed': 'false' }, v.name); b.onclick = () => { selected = v.id; paint(); }; vbox.appendChild(b); });
    paint();

    const qIn = $('#qty');
    const qty = () => Math.max(1, Math.min(10, parseInt(qIn.value, 10) || 1));
    $('#qMinus').onclick = () => (qIn.value = Math.max(1, qty() - 1));
    $('#qPlus').onclick = () => (qIn.value = Math.min(10, qty() + 1));
    qIn.onchange = () => (qIn.value = qty());
    $('#addBtn').onclick = () => addToCart(selected, qty());
    $('#buyBtn').onclick = (e) => checkout([{ variantId: selected, qty: qty() }], e.currentTarget);

    // shipping + returns + faq + contact
    const sh = $('#shipText'); if (sh) sh.textContent = shipLine();
    const rt = $('#returnText'); if (rt) rt.textContent = S.returnsPolicy;
    const fq = $('#faqList'); if (fq) { fq.innerHTML = ''; (S.faq || []).forEach((f) => { const d = el('details'); d.appendChild(el('summary', {}, f.q)); d.appendChild(el('p', {}, f.a)); fq.appendChild(d); }); }

    // product structured data for search engines
    const ld = {
      '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.shortDescription,
      image: location.origin + p.image, ...(S.brand ? { brand: { '@type': 'Brand', name: S.brand } } : {}),
      offers: p.variants.map((v) => ({ '@type': 'Offer', name: v.name, price: (priceOf(v) / 100).toFixed(2), priceCurrency: S.currency.toUpperCase(), availability: 'https://schema.org/InStock', url: location.origin + '/' })),
    };
    const s = el('script', { type: 'application/ld+json' }); s.textContent = JSON.stringify(ld); document.head.appendChild(s);
    if (new URLSearchParams(location.search).get('checkout') === 'cancelled') { const m = $('#msg'); if (m) m.textContent = 'Checkout was cancelled. Your cart is saved.'; }
  }

  function shipLine() { return ((S.shipping.priceCents === 0 ? 'Free shipping' : money.format(S.shipping.priceCents / 100) + ' shipping') + ' to the ' + S.shipping.countries.join(', ') + '. ' + (S.shipping.note || '')).trim(); }
  function fillCommon() {
    const has = (v) => Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim());
    const val = (k) => k.split('.').reduce((o, x) => (o ? o[x] : undefined), S);
    document.querySelectorAll('[data-need]').forEach((n) => (n.hidden = !has(val(n.dataset.need))));
    document.querySelectorAll('[data-brand]').forEach((n) => (n.textContent = S.brand || S.logoText));
    document.querySelectorAll('[data-tagline]').forEach((n) => (n.textContent = S.tagline));
    document.querySelectorAll('[data-email]').forEach((n) => { n.textContent = S.contactEmail; if (n.tagName === 'A') n.href = 'mailto:' + S.contactEmail; });
    document.querySelectorAll('[data-returns]').forEach((n) => (n.textContent = S.returnsPolicy));
    document.querySelectorAll('[data-ship]').forEach((n) => (n.textContent = shipLine()));
    document.querySelectorAll('[data-year]').forEach((n) => (n.textContent = new Date().getFullYear()));
  }

  async function boot() {
    try { S = await (await fetch('/store.json', { cache: 'no-cache' })).json(); } catch (e) { return; }
    money = new Intl.NumberFormat('en-US', { style: 'currency', currency: S.currency.toUpperCase() });
    fillCommon(); renderProduct(); renderCart();
    document.querySelectorAll('.cart-btn').forEach((b) => (b.onclick = openCart));
    if ($('#scrim')) { $('#scrim').onclick = closeCart; $('#drawer .x').onclick = closeCart; }
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#drawer') && !$('#drawer').hidden) closeCart(); });
    if ($('#cartCheckout')) $('#cartCheckout').onclick = (e) => checkout(readCart(), e.currentTarget);
    if (location.hash === '#cart' && $('#drawer')) openCart();
    window.dispatchEvent(new Event('store-ready'));
  }
  window.Store = { get: () => S, clearCart: () => writeCart([]), money: () => money };
  boot();
})();
