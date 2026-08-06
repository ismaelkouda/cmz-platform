#!/usr/bin/env node
/**
 * Mock backend **léger, zéro-dépendance** (Node http) pour le dev.
 *
 * Point d'entrée — l'implémentation est découpée sous `tools/mock-server/` :
 * un module par domaine + `router.mjs` (audit F-5 / P1-15).
 *
 * Lancer : `node tools/mock-server.mjs` (port 3333, override MOCK_PORT).
 * Proxy Angular : `apps/backoffice-angular/proxy.conf.json` → `/api/*`.
 */
import { createServer } from 'node:http';
import { PORT } from './mock-server/config.mjs';
import { fail, send } from './mock-server/http.mjs';
import { handle } from './mock-server/router.mjs';

createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
    handle(req, res, url).catch((e) => send(res, 500, fail(String(e))));
}).listen(PORT, () => {
    console.log(
        `🧪 Mock backend cmz sur http://localhost:${PORT} (proxy /api → ici)`
    );
});
