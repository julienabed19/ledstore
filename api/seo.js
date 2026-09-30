// Serves /sitemap.xml and /robots.txt with the correct site address.
const { origin } = require('../lib/stripe');
const PAGES = ['/', '/shipping-returns.html', '/privacy.html', '/terms.html'];

module.exports = (req, res) => {
  const site = origin(req);
  if (req.query && req.query.type === 'robots') {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(`User-agent: *\nAllow: /\nDisallow: /success.html\nDisallow: /api/\n\nSitemap: ${site}/sitemap.xml\n`);
  }
  res.setHeader('Content-Type', 'application/xml');
  const urls = PAGES.map((p) => `  <url><loc>${site}${p}</loc></url>`).join('\n');
  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
};
