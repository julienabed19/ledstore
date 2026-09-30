// POST /api/checkout  body: { items: [{ variantId, qty }] }
// Prices always come from store.json on the server, never from the browser.
const store = require('../public/store.json');
const { stripe, origin } = require('../lib/stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const items = Array.isArray(body.items) ? body.items.slice(0, 20) : [];
    const p = store.product;
    const site = origin(req);

    const line_items = [];
    for (const it of items) {
      const v = p.variants.find((x) => x.id === it.variantId);
      const qty = Math.floor(Number(it.qty));
      if (!v || !(qty >= 1 && qty <= 10)) continue;
      line_items.push({
        quantity: qty,
        price_data: {
          currency: store.currency,
          unit_amount: v.priceCents ?? p.priceCents,
          product_data: {
            name: p.variants.length > 1 ? `${p.name} (${v.name})` : p.name,
            images: [site + p.image],
            metadata: { product_id: p.id, variant_id: v.id },
          },
        },
      });
    }
    if (!line_items.length) return res.status(400).json({ error: 'Your cart is empty.' });

    const params = {
      mode: 'payment',
      line_items,
      shipping_address_collection: { allowed_countries: store.shipping.countries },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            display_name: store.shipping.label,
            fixed_amount: { amount: store.shipping.priceCents, currency: store.currency },
          },
        },
      ],
      phone_number_collection: { enabled: true },
      billing_address_collection: 'auto',
      success_url: site + '/success.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: site + '/?checkout=cancelled#cart',
    };
    const session = await stripe('POST', '/checkout/sessions', params);
    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error(e);
    return res.status(e.status && e.status < 500 ? 400 : 500).json({ error: 'Checkout could not start. Please try again.' });
  }
};
