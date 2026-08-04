import { fail, ok, readBody, readFormData, send } from '../http.mjs';
import { nextId, now } from '../ids.mjs';
import { paginate, paginateAll } from '../paginate.mjs';

export const boundary = (name) => ({
    id: `b-${name}`,
    name,
    code: name.slice(0, 3).toUpperCase(),
});

export const types = [
    {
        id: 'type-1',
        name: 'Antenne relais',
        description: 'Pylône de télécom',
        is_active: true,
        created_at: now(),
        updated_at: now(),
    },
    {
        id: 'type-2',
        name: 'Château d’eau',
        description: 'Réservoir surélevé',
        is_active: false,
        created_at: now(),
        updated_at: now(),
    },
    {
        id: 'type-3',
        name: 'Poste électrique',
        description: 'Transformation HTA/BT',
        is_active: true,
        created_at: now(),
        updated_at: now(),
    },
];

export const equipments = [
    {
        id: 'eq-1',
        name: 'Antenne Centre',
        infrastructure_type: 'type-1',
        description: 'Antenne du centre-ville',
        region: boundary('Centre'),
        department: boundary('Lomé'),
        municipality: boundary('Golfe'),
        position: '6.13,1.22',
        lat: '6.13',
        long: '1.22',
        created_at: now(),
        updated_at: now(),
    },
    {
        id: 'eq-2',
        name: 'Château Nord',
        infrastructure_type: 'type-2',
        description: 'Château d’eau nord',
        region: boundary('Nord'),
        department: boundary('Kara'),
        municipality: boundary('Kozah'),
        position: '9.55,1.19',
        lat: '9.55',
        long: '1.19',
        created_at: now(),
        updated_at: now(),
    },
];


/**
 * @param {{ path: string, method: string, req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, page: string | null, url: URL }} ctx
 * @returns {Promise<boolean|void>|boolean|void} truthy si la route a été servie
 */
export async function handle(ctx) {
    const { path, method, req, res, page, url } = ctx;
    let m;
    // ---- TYPES ----
    // liste paginée (avec ?page) vs select (sans page) sur la base
    if (path === 'infrastructures/equipment-types' && method === 'GET') {
        return page !== null
            ? send(res, 200, ok(paginate(types, page)))
            : send(
                  res,
                  200,
                  ok(
                      types.map((t) => ({
                          id: t.id,
                          name: t.name,
                          description: t.description,
                      }))
                  )
              );
    }
    m = path.match(/^infrastructures\/equipment-types\/(.+)$/);
    if (m) {
        const seg = m[1];
        const id = seg.split('/')[0];
        const item = types.find((t) => t.id === id);
        if (seg === `${id}/update` && method === 'POST') {
            const b = await readBody(req);
            if (item)
                Object.assign(item, {
                    name: b.name,
                    description: b.description,
                    updated_at: now(),
                });
            return send(res, 200, ok(null, 'Type mis à jour.'));
        }
        if (seg === `${id}/delete` && method === 'DELETE') {
            const i = types.findIndex((t) => t.id === id);
            if (i >= 0) types.splice(i, 1);
            return send(res, 200, ok(null, 'Type supprimé.'));
        }
        if (seg === `${id}/enable` && method === 'PUT') {
            if (item) item.is_active = true;
            return send(res, 200, ok(null, 'Type activé.'));
        }
        if (seg === `${id}/disable` && method === 'PUT') {
            if (item) item.is_active = false;
            return send(res, 200, ok(null, 'Type désactivé.'));
        }
        if (method === 'GET') {
            return item
                ? send(res, 200, ok(item))
                : send(res, 404, fail('Type introuvable.'));
        }
    }
    if (path === 'infrastructures/equipment-types/store' && method === 'POST') {
        const b = await readBody(req);
        types.unshift({
            id: nextId(),
            name: b.name,
            description: b.description,
            is_active: false,
            created_at: now(),
            updated_at: now(),
        });
        return send(res, 201, ok(null, 'Type créé.'));
    }

    // ---- EQUIPMENTS ----
    if (path === 'infrastructures/equipments' && method === 'GET') {
        return page !== null
            ? send(res, 200, ok(paginate(equipments, page)))
            : send(
                  res,
                  200,
                  ok(
                      equipments.map((e) => ({
                          id: e.id,
                          name: e.name,
                          description: e.description,
                      }))
                  )
              );
    }
    m = path.match(/^infrastructures\/equipments\/(.+)$/);
    if (m) {
        const seg = m[1];
        const id = seg.split('/')[0];
        const item = equipments.find((e) => e.id === id);
        if (seg === `${id}/update` && method === 'POST') {
            const b = await readBody(req);
            if (item)
                Object.assign(item, {
                    name: b.name,
                    infrastructure_type: b.infrastructure_type,
                    description: b.description,
                    lat: String(b.latitude),
                    long: String(b.longitude),
                    position: `${b.latitude},${b.longitude}`,
                    updated_at: now(),
                });
            return send(res, 200, ok(null, 'Infrastructure mise à jour.'));
        }
        if (seg === `${id}/delete` && method === 'DELETE') {
            const i = equipments.findIndex((e) => e.id === id);
            if (i >= 0) equipments.splice(i, 1);
            return send(res, 200, ok(null, 'Infrastructure supprimée.'));
        }
        if (method === 'GET') {
            if (!item)
                return send(res, 404, fail('Infrastructure introuvable.'));
            return send(
                res,
                200,
                ok({
                    id: item.id,
                    name: item.name,
                    type: item.infrastructure_type,
                    description: item.description,
                    region: item.region,
                    department: item.department,
                    municipality: item.municipality,
                    position: item.position,
                    lat: item.lat,
                    long: item.long,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                })
            );
        }
    }
    if (path === 'infrastructures/equipments/store' && method === 'POST') {
        const b = await readBody(req);
        equipments.unshift({
            id: nextId(),
            name: b.name,
            infrastructure_type: b.infrastructure_type,
            description: b.description,
            region: boundary('Centre'),
            department: boundary('Lomé'),
            municipality: boundary('Golfe'),
            position: `${b.latitude},${b.longitude}`,
            lat: String(b.latitude),
            long: String(b.longitude),
            created_at: now(),
            updated_at: now(),
        });
        return send(res, 201, ok(null, 'Infrastructure créée.'));
    }
    return false;
}
