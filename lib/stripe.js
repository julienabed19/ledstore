// Tiny Stripe API helper. Runs only on the server (Vercel functions), never in the browser.
const API = 'https://api.stripe.com/v1';

function encode(obj, prefix, out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') encode(v, key, out);
    else out.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(v)));
  }
  return out;
}

async function stripe(method, path, params) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw Object.assign(new Error('STRIPE_SECRET_KEY is not set'), { status: 500 });
  const body = params ? encode(params).join('&') : undefined;
  const url = API + path + (method === 'GET' && body ? '?' + body : '');
  const r = await fetch(url, {
    method,
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method === 'GET' ? undefined : body,
  });
  const data = await r.json();
  if (!r.ok) throw Object.assign(new Error((data.error && data.error.message) || 'Stripe error'), { status: r.status });
  return data;
}

function origin(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

module.exports = { stripe, origin, encode };
