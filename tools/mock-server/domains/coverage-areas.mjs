import { fail, ok, readBody, readFormData, send } from '../http.mjs';
import { nextId, now } from '../ids.mjs';
import { paginate, paginateAll } from '../paginate.mjs';

// ---- COVERAGE-AREAS : site-group (entité plate, pas de hiérarchie) ------
export const siteGroups = [
    {
        id: 'sg-1',
        code: 'SG-LOM',
        name: 'Groupe Lomé',
        description: 'Sites du centre-ville de Lomé',
        is_active: true,
        created_at: now(),
        updated_at: now(),
    },
    {
        id: 'sg-2',
        code: 'SG-KAR',
        name: 'Groupe Kara',
        description: 'Sites de la région de Kara',
        is_active: false,
        created_at: now(),
        updated_at: now(),
    },
    {
        id: 'sg-3',
        code: 'SG-MAR',
        name: 'Groupe Maritime',
        description: 'Sites de la région Maritime',
        is_active: true,
        created_at: now(),
        updated_at: now(),
    },
];

// ---- COVERAGE-AREAS : tower-type (select seul, pas de CRUD) -------------
export const towerTypes = [
    { id: 'tt-1', name: 'Pylône treillis' },
    { id: 'tt-2', name: 'Pylône monopode' },
    { id: 'tt-3', name: 'Pylône haubané' },
];

// ---- COVERAGE-AREAS : mobile-network -------------------------------------
// `infrastructure_type` référence l'uniqId d'un `site-group` (nom trompeur
// mais fidèle au wire du source, cf. plan module-coverage-areas.md Phase 2).
export const mobileNetworks = [
    {
        id: 'mn-1',
        site_id: 'SITE-001',
        site_name: 'Site Lomé Centre',
        infrastructure_type: 'sg-1',
        tower_type_id: 'tt-1',
        tower_type_name: 'Pylône treillis',
        tower_size: 30,
        technology: ['2G', '3G', '4G'],
        operator: 'MTN',
        radius: 5,
        is_active: true,
        created_at: now(),
        updated_at: now(),
    },
    {
        id: 'mn-2',
        site_id: 'SITE-002',
        site_name: 'Site Kara Nord',
        infrastructure_type: 'sg-2',
        tower_type_id: 'tt-2',
        tower_type_name: 'Pylône monopode',
        tower_size: 24,
        technology: ['3G', '4G'],
        operator: 'Orange',
        radius: 3,
        is_active: false,
        created_at: now(),
        updated_at: now(),
    },
    {
        id: 'mn-3',
        site_id: 'SITE-003',
        site_name: 'Site Maritime Sud',
        infrastructure_type: 'sg-3',
        tower_type_id: 'tt-3',
        tower_type_name: 'Pylône haubané',
        tower_size: 40,
        technology: ['4G', '5G'],
        operator: 'Moov',
        radius: 8,
        is_active: true,
        created_at: now(),
        updated_at: now(),
    },
];

// ---- COVERAGE-AREAS : fiber-constructor (select seul, pas de CRUD) ------
export const fiberConstructors = [
    { id: 'fc-1', name: 'Huawei' },
    { id: 'fc-2', name: 'Nokia' },
    { id: 'fc-3', name: 'ZTE' },
];

// ---- COVERAGE-AREAS : optical-fiber-network ------------------------------
// `geom_url` simule un fichier déjà stocké (jamais le binaire lui-même,
// cf. `readFormData`).
export const opticalFiberNetworks = [
    {
        id: 'ofn-1',
        name: 'Backbone Lomé-Kara',
        operator: 'MTN',
        fiber_constructor_id: 'fc-1',
        fiber_constructor_name: 'Huawei',
        type: 'single-mode',
        geom_url: '/mock/geo/ofn-1.geojson',
        is_active: true,
        created_at: now(),
        updated_at: now(),
    },
    {
        id: 'ofn-2',
        name: 'Boucle Maritime',
        operator: 'Orange',
        fiber_constructor_id: 'fc-2',
        fiber_constructor_name: 'Nokia',
        type: 'multi-mode',
        geom_url: '/mock/geo/ofn-2.geojson',
        is_active: false,
        created_at: now(),
        updated_at: now(),
    },
    {
        id: 'ofn-3',
        name: 'Liaison Plateaux',
        operator: 'Moov',
        fiber_constructor_id: 'fc-3',
        fiber_constructor_name: 'ZTE',
        type: 'single-mode',
        geom_url: '/mock/geo/ofn-3.geojson',
        is_active: true,
        created_at: now(),
        updated_at: now(),
    },
];

// ---- COVERAGE-AREAS : radio-relay-links ----------------------------------
// JSON simple (pas de multipart) : aucun champ fichier sur cette entité,
// contrairement à `optical-fiber-network` (cf. décision d'ingénieur, Phase 3).
export const radioRelayLinks = [
    {
        id: 'rrl-1',
        name: 'Liaison Lomé-Aného',
        operator: 'MTN',
        frequency: '900MHZ',
        start_date: '2024-01-15T00:00:00.000Z',
        end_date: '2029-01-15T00:00:00.000Z',
        is_active: true,
        created_at: now(),
        updated_at: now(),
        geom_url: '/mock/geo/rrl-1.geojson',
    },
    {
        id: 'rrl-2',
        name: 'Liaison Kara-Sokodé',
        operator: 'ORANGE',
        frequency: '1800MHZ',
        start_date: '2023-06-01T00:00:00.000Z',
        end_date: '2028-06-01T00:00:00.000Z',
        is_active: false,
        created_at: now(),
        updated_at: now(),
        geom_url: '/mock/geo/rrl-2.geojson',
    },
    {
        id: 'rrl-3',
        name: 'Liaison Atakpamé-Kpalimé',
        operator: 'MOOV',
        frequency: '2300MHZ',
        start_date: '2022-09-10T00:00:00.000Z',
        end_date: '2027-09-10T00:00:00.000Z',
        is_active: true,
        created_at: now(),
        updated_at: now(),
        geom_url: '/mock/geo/rrl-3.geojson',
    },
];


/**
 * @param {{ path: string, method: string, req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, page: string | null, url: URL }} ctx
 * @returns {Promise<boolean|void>|boolean|void} truthy si la route a été servie
 */
export async function handle(ctx) {
    const { path, method, req, res, page, url } = ctx;
    let m;
    // ---- COVERAGE-AREAS : SITE-GROUP ----
    // liste paginée (avec ?page) vs select (sans page) sur la base
    if (path === 'infrastructures/site-groups' && method === 'GET') {
        return page !== null
            ? send(res, 200, ok(paginate(siteGroups, page)))
            : send(
                  res,
                  200,
                  ok(
                      siteGroups.map((sg) => ({
                          id: sg.id,
                          name: sg.name,
                          description: sg.description,
                      }))
                  )
              );
    }
    m = path.match(/^infrastructures\/site-groups\/(.+)$/);
    if (m) {
        const seg = m[1];
        const id = seg.split('/')[0];
        const item = siteGroups.find((sg) => sg.id === id);
        if (seg === `${id}/update` && method === 'POST') {
            const b = await readBody(req);
            if (item)
                Object.assign(item, {
                    code: b.code,
                    name: b.name,
                    description: b.description,
                    updated_at: now(),
                });
            return send(res, 200, ok(null, 'Groupe de sites mis à jour.'));
        }
        if (seg === `${id}/delete` && method === 'DELETE') {
            const i = siteGroups.findIndex((sg) => sg.id === id);
            if (i >= 0) siteGroups.splice(i, 1);
            return send(res, 200, ok(null, 'Groupe de sites supprimé.'));
        }
        if (seg === `${id}/enable` && method === 'PUT') {
            if (item) item.is_active = true;
            return send(res, 200, ok(null, 'Groupe de sites activé.'));
        }
        if (seg === `${id}/disable` && method === 'PUT') {
            if (item) item.is_active = false;
            return send(res, 200, ok(null, 'Groupe de sites désactivé.'));
        }
        if (method === 'GET') {
            return item
                ? send(res, 200, ok(item))
                : send(res, 404, fail('Groupe de sites introuvable.'));
        }
    }
    if (path === 'infrastructures/site-groups/store' && method === 'POST') {
        const b = await readBody(req);
        siteGroups.unshift({
            id: nextId(),
            code: b.code,
            name: b.name,
            description: b.description ?? '',
            is_active: false,
            created_at: now(),
            updated_at: now(),
        });
        return send(res, 201, ok(null, 'Groupe de sites créé.'));
    }

    // ---- COVERAGE-AREAS : TOWER-TYPE (select seul) ----
    if (
        path === 'infrastructures/tower-types/select-field' &&
        method === 'GET'
    ) {
        return send(
            res,
            200,
            ok(towerTypes.map((t) => ({ id: t.id, name: t.name })))
        );
    }

    // ---- COVERAGE-AREAS : MOBILE-NETWORK ----
    // même base URL pour la liste paginée (?page) et le find-one (/id) —
    // fidèle à `MobileNetworkApi.readAll`/`MobileNetworkFindOneApi.execute`.
    if (path === 'infrastructures/coverage-areas' && method === 'GET') {
        return page !== null
            ? send(res, 200, ok(paginate(mobileNetworks, page)))
            : send(res, 200, ok(paginate(mobileNetworks, '1')));
    }
    m = path.match(/^infrastructures\/coverage-areas\/(.+)$/);
    if (m) {
        const seg = m[1];
        const id = seg.split('/')[0];
        const item = mobileNetworks.find((mn) => mn.id === id);
        if (seg === `${id}/update` && method === 'POST') {
            const b = await readBody(req);
            if (item) {
                const towerType = towerTypes.find(
                    (t) => t.id === b.tower_type_id
                );
                Object.assign(item, {
                    site_id: b.site_id,
                    site_name: b.site_name,
                    infrastructure_type: b.infrastructure_type,
                    tower_type_id: b.tower_type_id,
                    tower_type_name: towerType?.name ?? item.tower_type_name,
                    tower_size: b.tower_size,
                    technology: b.technology,
                    operator: b.operator,
                    radius: b.radius,
                    updated_at: now(),
                });
            }
            return send(res, 200, ok(null, 'Réseau mobile mis à jour.'));
        }
        if (seg === `${id}/delete` && method === 'DELETE') {
            const i = mobileNetworks.findIndex((mn) => mn.id === id);
            if (i >= 0) mobileNetworks.splice(i, 1);
            return send(res, 200, ok(null, 'Réseau mobile supprimé.'));
        }
        if (seg === `${id}/enable` && method === 'PUT') {
            if (item) item.is_active = true;
            return send(res, 200, ok(null, 'Réseau mobile activé.'));
        }
        if (seg === `${id}/disable` && method === 'PUT') {
            if (item) item.is_active = false;
            return send(res, 200, ok(null, 'Réseau mobile désactivé.'));
        }
        if (method === 'GET') {
            return item
                ? send(res, 200, ok(item))
                : send(res, 404, fail('Réseau mobile introuvable.'));
        }
    }
    if (path === 'infrastructures/coverage-areas/store' && method === 'POST') {
        const b = await readBody(req);
        const towerType = towerTypes.find((t) => t.id === b.tower_type_id);
        mobileNetworks.unshift({
            id: nextId(),
            site_id: b.site_id,
            site_name: b.site_name,
            infrastructure_type: b.infrastructure_type,
            tower_type_id: b.tower_type_id,
            tower_type_name: towerType?.name ?? '',
            tower_size: b.tower_size,
            technology: b.technology ?? [],
            operator: b.operator,
            radius: b.radius,
            is_active: false,
            created_at: now(),
            updated_at: now(),
        });
        return send(res, 201, ok(null, 'Réseau mobile créé.'));
    }

    // ---- COVERAGE-AREAS : FIBER-CONSTRUCTOR (select seul) ----
    if (
        path === 'infrastructures/fiber-constructors/select-field' &&
        method === 'GET'
    ) {
        return send(
            res,
            200,
            ok(fiberConstructors.map((c) => ({ id: c.id, name: c.name })))
        );
    }

    // ---- COVERAGE-AREAS : OPTICAL-FIBER-NETWORK ----
    // `store`/`update` reçoivent un `multipart/form-data` (upload `geom_file`)
    // — cf. `readFormData`, seul endpoint du mock à en avoir besoin.
    if (path === 'infrastructures/optical-fibers' && method === 'GET') {
        return page !== null
            ? send(res, 200, ok(paginate(opticalFiberNetworks, page)))
            : send(res, 200, ok(paginate(opticalFiberNetworks, '1')));
    }
    m = path.match(/^infrastructures\/optical-fibers\/(.+)$/);
    if (m) {
        const seg = m[1];
        const id = seg.split('/')[0];
        const item = opticalFiberNetworks.find((ofn) => ofn.id === id);
        if (seg === `${id}/update` && method === 'POST') {
            const b = await readFormData(req);
            if (item) {
                const constructor = fiberConstructors.find(
                    (c) => c.id === b.fiber_constructor_id
                );
                Object.assign(item, {
                    name: b.name,
                    operator: b.operator,
                    fiber_constructor_id: b.fiber_constructor_id,
                    fiber_constructor_name:
                        constructor?.name ?? item.fiber_constructor_name,
                    type: b.type,
                    ...(b.geom_file
                        ? { geom_url: `/mock/geo/${id}-${b.geom_file}` }
                        : {}),
                    updated_at: now(),
                });
            }
            return send(res, 200, ok(null, 'Réseau fibre optique mis à jour.'));
        }
        if (seg === `${id}/delete` && method === 'DELETE') {
            const i = opticalFiberNetworks.findIndex((ofn) => ofn.id === id);
            if (i >= 0) opticalFiberNetworks.splice(i, 1);
            return send(res, 200, ok(null, 'Réseau fibre optique supprimé.'));
        }
        if (seg === `${id}/enable` && method === 'PUT') {
            if (item) item.is_active = true;
            return send(res, 200, ok(null, 'Réseau fibre optique activé.'));
        }
        if (seg === `${id}/disable` && method === 'PUT') {
            if (item) item.is_active = false;
            return send(res, 200, ok(null, 'Réseau fibre optique désactivé.'));
        }
        if (method === 'GET') {
            return item
                ? send(res, 200, ok(item))
                : send(res, 404, fail('Réseau fibre optique introuvable.'));
        }
    }
    if (path === 'infrastructures/optical-fibers/store' && method === 'POST') {
        const b = await readFormData(req);
        const constructor = fiberConstructors.find(
            (c) => c.id === b.fiber_constructor_id
        );
        const id = nextId();
        opticalFiberNetworks.unshift({
            id,
            name: b.name,
            operator: b.operator,
            fiber_constructor_id: b.fiber_constructor_id,
            fiber_constructor_name: constructor?.name ?? '',
            type: b.type,
            geom_url: b.geom_file
                ? `/mock/geo/${id}-${b.geom_file}`
                : undefined,
            is_active: false,
            created_at: now(),
            updated_at: now(),
        });
        return send(res, 201, ok(null, 'Réseau fibre optique créé.'));
    }

    // ---- COVERAGE-AREAS : RADIO-RELAY-LINKS ----
    // même base URL pour la liste paginée (?page) et le find-one (/id) —
    // fidèle à `RadioRelayLinksApi.readAll`/`RadioRelayLinksFindOneApi.execute`.
    if (path === 'infrastructures/radio-relay-links' && method === 'GET') {
        return page !== null
            ? send(res, 200, ok(paginate(radioRelayLinks, page)))
            : send(res, 200, ok(paginate(radioRelayLinks, '1')));
    }
    m = path.match(/^infrastructures\/radio-relay-links\/(.+)$/);
    if (m) {
        const seg = m[1];
        const id = seg.split('/')[0];
        const item = radioRelayLinks.find((rrl) => rrl.id === id);
        if (seg === `${id}/update` && method === 'POST') {
            const b = await readBody(req);
            if (item) {
                Object.assign(item, {
                    name: b.name,
                    operator: b.operator,
                    frequency: b.frequency,
                    start_date: b.start_date,
                    end_date: b.end_date,
                    updated_at: now(),
                });
            }
            return send(res, 200, ok(null, 'Faisceau hertzien mis à jour.'));
        }
        if (seg === `${id}/delete` && method === 'DELETE') {
            const i = radioRelayLinks.findIndex((rrl) => rrl.id === id);
            if (i >= 0) radioRelayLinks.splice(i, 1);
            return send(res, 200, ok(null, 'Faisceau hertzien supprimé.'));
        }
        if (seg === `${id}/enable` && method === 'PUT') {
            if (item) item.is_active = true;
            return send(res, 200, ok(null, 'Faisceau hertzien activé.'));
        }
        if (seg === `${id}/disable` && method === 'PUT') {
            if (item) item.is_active = false;
            return send(res, 200, ok(null, 'Faisceau hertzien désactivé.'));
        }
        if (method === 'GET') {
            return item
                ? send(res, 200, ok(item))
                : send(res, 404, fail('Faisceau hertzien introuvable.'));
        }
    }
    if (
        path === 'infrastructures/radio-relay-links/store' &&
        method === 'POST'
    ) {
        const b = await readBody(req);
        radioRelayLinks.unshift({
            id: nextId(),
            name: b.name,
            operator: b.operator,
            frequency: b.frequency,
            start_date: b.start_date,
            end_date: b.end_date,
            is_active: false,
            created_at: now(),
            updated_at: now(),
        });
        return send(res, 201, ok(null, 'Faisceau hertzien créé.'));
    }
    return false;
}
