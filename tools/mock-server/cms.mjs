import { fail, ok, readBody, readFormData, send } from './http.mjs';
import { paginate } from './paginate.mjs';

export async function handleCmsEntity(path, method, req, res, page, cfg) {
    const {
        base,
        items,
        toListItem,
        toFindOneItem,
        formData,
        actions,
        labels,
    } = cfg;

    if (path === base && method === 'GET') {
        send(res, 200, ok(paginate(items.map(toListItem), page ?? '1')));
        return true;
    }

    if (path === `${base}/store` && method === 'POST') {
        const b = formData ? await readFormData(req) : await readBody(req);
        items.unshift(cfg.applyCreate(b));
        send(res, 201, ok(null, labels.created));
        return true;
    }

    const m = path.match(new RegExp(`^${base}/(.+)$`));
    if (m) {
        const seg = m[1];
        const id = seg.split('/')[0];
        const item = items.find((it) => it.id === id);

        if (seg === `${id}/update` && method === 'POST') {
            const b = formData ? await readFormData(req) : await readBody(req);
            if (item) cfg.applyUpdate(item, b);
            send(res, 200, ok(null, labels.updated));
            return true;
        }
        if (seg === `${id}/delete` && method === 'DELETE') {
            const i = items.findIndex((it) => it.id === id);
            if (i >= 0) items.splice(i, 1);
            send(res, 200, ok(null, labels.deleted));
            return true;
        }
        if (seg === `${id}/${actions.on}` && method === 'PUT') {
            if (item) item[actions.field] = actions.onValue;
            send(res, 200, ok(null, labels.onMsg));
            return true;
        }
        if (seg === `${id}/${actions.off}` && method === 'PUT') {
            if (item) item[actions.field] = actions.offValue;
            send(res, 200, ok(null, labels.offMsg));
            return true;
        }
        if (seg === id && method === 'GET') {
            if (item) {
                send(res, 200, ok(toFindOneItem(item)));
            } else {
                send(res, 404, fail(labels.notFound));
            }
            return true;
        }
    }

    return false;
}

/** Parse un champ tableau sérialisé JSON par `buildFormData` (cf. util). */
export function parseJsonArray(raw, fallback = []) {
    if (Array.isArray(raw)) return raw;
    if (typeof raw !== 'string' || !raw) return fallback;
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
}
