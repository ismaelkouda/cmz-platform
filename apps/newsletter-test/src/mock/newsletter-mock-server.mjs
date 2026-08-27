#!/usr/bin/env node
/**
 * Mock minimal, zéro-dépendance, dédié au test newsletter-test/newsletter.
 *
 * Isolé de tools/mock-server (infra legacy) — voir la discussion qui a mené
 * à ce choix : ce cas est un test isolé de generator-platform, pas un
 * domaine métier à intégrer à l'infra existante.
 *
 * Répond uniquement à POST /newsletter :
 * - email contenant "fail" -> 422, réponse d'erreur figée.
 * - tout autre email valide -> 200, réponse de succès figée avec un
 *   subscription_id généré (horodatage), conforme à
 *   NewsletterSubscriptionResult { subscription_id, message }.
 *
 * Lancer : node apps/newsletter-test/src/mock/newsletter-mock-server.mjs
 * (port 4310, override NEWSLETTER_MOCK_PORT).
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.NEWSLETTER_MOCK_PORT ?? 4310);

function send(res, status, body) {
    const json = JSON.stringify(body);
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(json);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', (chunk) => {
            raw += chunk;
        });
        req.on('end', () => {
            try {
                resolve(raw.length ? JSON.parse(raw) : {});
            } catch (error) {
                reject(error);
            }
        });
        req.on('error', reject);
    });
}

createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
        send(res, 204, {});
        return;
    }
    if (req.method !== 'POST' || req.url !== '/newsletter') {
        send(res, 404, { error: true, message: 'route inconnue' });
        return;
    }
    let body;
    try {
        body = await readBody(req);
    } catch {
        send(res, 400, { error: true, message: 'JSON invalide' });
        return;
    }
    const email = typeof body.email === 'string' ? body.email : '';
    if (email.includes('fail')) {
        send(res, 422, {
            error: true,
            message: 'Adresse refusée par le fournisseur newsletter (mock).',
        });
        return;
    }
    send(res, 200, {
        subscription_id: `sub_${Date.now()}`,
        message: 'Inscription confirmée (réponse mock figée).',
    });
}).listen(PORT, () => {
    console.log(
        `🧪 Mock newsletter (isolé, test generator-platform) sur http://localhost:${PORT}`
    );
});
