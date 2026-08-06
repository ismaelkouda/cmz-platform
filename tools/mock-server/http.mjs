export const ok = (data, message = '') => ({ error: false, message, data });
export const fail = (message) => ({ error: true, message, data: null });

/** Envoie la réponse JSON + CORS ; retourne `true` (signal « route gérée »). */
export function send(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    });
    res.end(payload);
    return true;
}

export const readBody = (req) =>
    new Promise((resolve) => {
        let raw = '';
        req.on('data', (c) => (raw += c));
        req.on('end', () => {
            try {
                resolve(raw ? JSON.parse(raw) : {});
            } catch {
                resolve({});
            }
        });
    });

/**
 * Parseur `multipart/form-data` minimal — nécessaire pour `optical-fiber-network`
 * (`create`/`update` envoient un `FormData` via `buildFormData`, cf.
 * `@cmz/shared-data`, à cause de l'upload `geom_file`). Ne stocke pas le
 * contenu binaire du fichier : seul le nom du fichier est capturé (suffisant
 * pour un mock — le contrat testé est « un fichier a bien été envoyé », pas
 * son contenu).
 */
export const readFormData = (req) =>
    new Promise((resolve) => {
        const contentType = req.headers['content-type'] ?? '';
        const boundaryMatch = contentType.match(/boundary=(.+)$/);
        if (!boundaryMatch) {
            resolve({});
            return;
        }
        const boundary = `--${boundaryMatch[1]}`;
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
            const raw = Buffer.concat(chunks).toString('binary');
            const result = {};
            raw.split(boundary).forEach((part) => {
                const nameMatch = part.match(/name="([^"]+)"/);
                if (!nameMatch) return;
                const key = nameMatch[1];
                const filenameMatch = part.match(/filename="([^"]*)"/);
                const headerEnd = part.indexOf('\r\n\r\n');
                if (headerEnd < 0) return;
                const value = part
                    .slice(headerEnd + 4)
                    .replace(/\r\n--$/, '')
                    .replace(/\r\n$/, '');
                result[key] = filenameMatch ? filenameMatch[1] : value;
            });
            resolve(result);
        });
    });
