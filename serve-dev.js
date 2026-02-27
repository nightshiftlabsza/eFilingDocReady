// Dev server for SARS eFiling PWA — run with: node serve-dev.js
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

http.createServer((req, res) => {
  const url      = req.url.split('?')[0];
  const filePath = path.join(ROOT, url === '/' ? 'index.html' : url);

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type':          MIME[ext] || 'application/octet-stream',
      'Service-Worker-Allowed': '/',          // required for PWA SW scope
      'Cache-Control':          'no-store',   // always fresh in dev
    });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Serving on http://localhost:${PORT}`));
