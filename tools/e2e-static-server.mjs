/**
 * Serveur statique SPA + reverse-proxy `/api` → mock (T12-6).
 * Zéro watchers (évite EMFILE macOS / agent sandbox) — alternative au
 * `nx serve` pour Playwright.
 *
 * Prérequis : dist présent
 *   bunx nx run backoffice-angular:build:development
 *
 * Usage :
 *   MOCK_PORT=3333 E2E_APP_PORT=4200 node tools/e2e-static-server.mjs
 */
import { createServer, request as httpRequest } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(
    ROOT,
    'dist/apps/backoffice-angular/browser'
);
const PORT = Number(process.env.E2E_APP_PORT ?? 4200);
const MOCK_PORT = Number(process.env.MOCK_PORT ?? 3333);
const MOCK_HOST = process.env.MOCK_HOST ?? '127.0.0.1';

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.map': 'application/json',
};

if (!existsSync(join(DIST, 'index.html'))) {
    console.error(
        `[e2e-static] index.html absent dans ${DIST} — build d'abord:\n` +
            `  bunx nx run backoffice-angular:build:development`
    );
    process.exit(1);
}

function safeJoin(root, reqPath) {
    const cleaned = normalize(decodeURIComponent(reqPath)).replace(
        /^(\.\.(\/|\\|$))+/,
        ''
    );
    const full = resolve(root, '.' + cleaned);
    if (!full.startsWith(root)) return null;
    return full;
}

function proxyToMock(req, res) {
    const opts = {
        hostname: MOCK_HOST,
        port: MOCK_PORT,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: `${MOCK_HOST}:${MOCK_PORT}` },
    };
    const upstream = httpRequest(opts, (up) => {
        res.writeHead(up.statusCode ?? 502, up.headers);
        up.pipe(res);
    });
    upstream.on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(
            JSON.stringify({
                error: true,
                message: `mock proxy: ${err.message}`,
                data: null,
            })
        );
    });
    req.pipe(upstream);
}

function serveFile(filePath, res) {
    const ext = extname(filePath);
    res.writeHead(200, {
        'Content-Type': MIME[ext] ?? 'application/octet-stream',
        'Cache-Control': 'no-cache',
    });
    res.end(readFileSync(filePath));
}

createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);

    // Health pour Playwright webServer
    if (url.pathname === '/e2e-health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
    }

    // Proxy API → mock (même sémantique que proxy.conf.json)
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
        // mock voit /auth/login quand Angular appelle /api/auth/login
        // → strip /api prefix for mock path style... Angular env uses
        // authenticationUrl: '/api/auth/' so mock receives full path after proxy.
        // proxy.conf maps /api → localhost:3333 with path /api kept or stripped?
        // changeOrigin target: mock listens and normalizeReportPath(rel(pathname)).
        // Angular proxy typically keeps /api prefix unless pathRewrite.
        // Check path.mjs
        proxyToMock(req, res);
        return;
    }

    let filePath = safeJoin(DIST, url.pathname);
    if (!filePath) {
        res.writeHead(400);
        res.end('bad path');
        return;
    }
    if (url.pathname.endsWith('/') || !extname(url.pathname)) {
        // SPA fallback
        if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
            filePath = join(DIST, 'index.html');
        }
    }
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
        filePath = join(DIST, 'index.html');
    }
    serveFile(filePath, res);
}).listen(PORT, '127.0.0.1', () => {
    console.log(
        `[e2e-static] http://127.0.0.1:${PORT}  (dist=${DIST}, mock=${MOCK_HOST}:${MOCK_PORT})`
    );
});
