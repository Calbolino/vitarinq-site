const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// ─── Charge .env (parseur simple) ; les vraies variables d'env / Secrets Replit priment ───
function loadEnv() {
  const out = {};
  try {
    const p = path.join(__dirname, '.env');
    if (fs.existsSync(p)) {
      fs.readFileSync(p, 'utf8').split(/\r?\n/).forEach((line) => {
        if (!line || /^\s*#/.test(line)) return;
        const i = line.indexOf('=');
        if (i === -1) return;
        const k = line.slice(0, i).trim();
        let v = line.slice(i + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        if (k) out[k] = v;
      });
    }
  } catch (e) {
    /* .env absent ou illisible : on ignore */
  }
  return out;
}

const FILE_ENV = loadEnv();
// process.env (Secrets Replit) prioritaire, sinon .env local
const env = (key) =>
  process.env[key] != null && process.env[key] !== '' ? process.env[key] : FILE_ENV[key] || '';

// Jetons remplacés dans le HTML servi → valeur depuis .env / Secrets Replit
const PLACEHOLDERS = {
  '__WEB3FORMS_ACCESS_KEY__': env('WEB3FORMS_ACCESS_KEY'),
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const ROOT = __dirname;

const server = http.createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    let finalPath = filePath;
    if (err || !stat.isFile()) {
      finalPath = path.join(ROOT, 'index.html');
    }
    fs.readFile(finalPath, (err2, data) => {
      if (err2) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(finalPath).toLowerCase();
      res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');

      // Injection des secrets dans les réponses HTML
      if (ext === '.html') {
        let html = data.toString('utf8');
        for (const token in PLACEHOLDERS) {
          html = html.split(token).join(PLACEHOLDERS[token]);
        }
        res.writeHead(200);
        res.end(html);
        return;
      }

      res.writeHead(200);
      res.end(data);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}/`);
});
