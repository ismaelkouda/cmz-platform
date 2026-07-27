#!/usr/bin/env node
/**
 * Mock backend **léger, zéro-dépendance** (Node http) pour le dev.
 *
 * Sert les endpoints des modules `administrative-infrastructure`,
 * `administrative-boundary`, `authentication` et `coverage-areas`
 * (`site-group` et `mobile-network`, entités plates — même forme que
 * `infrastructure-types` ; `tower-type`, select seul) avec
 * l'enveloppe attendue par le kernel (`{ error, message, data }`) et la forme
 * de pagination Laravel
 * (`current_page`, `data`, `last_page`, `per_page`, `total`, …). Données en
 * mémoire → create/update/delete/enable/disable persistent le temps du run.
 *
 * `administrative-boundary` est une hiérarchie région → département →
 * commune : les vues imbriquées (`/regions/{id}/departments`,
 * `/departments/{id}/municipalities`) et les selects cascade
 * (`/selected-field`) sont réellement scopés par id parent (c'est le cœur du
 * test « hiérarchique »). Les filtres `search`/dates restent ignorés — comme
 * pour `administrative-infrastructure` — le mock n'implémente que ce qui est
 * structurellement nécessaire.
 *
 * `authentication` : les échecs métier (identifiants invalides, lien de
 * réinitialisation invalide) renvoient **HTTP 200 + `{error:true, message}`**,
 * jamais un vrai code HTTP d'erreur — c'est le contrat que `unwrapResponse`
 * (`@cmz/shared-data`) sait dé-emballer en `ServerResponseError`. Un vrai
 * statut non-2xx court-circuiterait `HttpClient` avant même d'atteindre le
 * mapper (aucun intercepteur ne traduit `HttpErrorResponse` dans ce socle
 * pour l'instant), donc ne serait jamais vu comme une erreur domaine par
 * l'UI. `forgot-password` ne révèle jamais si l'email existe (message
 * générique dans tous les cas) — anti-enumeration, pas une simplification du
 * mock.
 *
 * Lancer : `node tools/mock-server.mjs` (port 3333). Le dev-server Angular y
 * route `/api/*` via `apps/backoffice-angular/proxy.conf.json`.
 */
import { createServer } from 'node:http';

const PORT = process.env.MOCK_PORT ? Number(process.env.MOCK_PORT) : 3333;
const PER_PAGE = 10;
let seq = 100;
const nextId = () => `id-${++seq}`;
const now = () => new Date().toISOString();

// ---------------------------------------------------------------- seed data
const boundary = (name) => ({
    id: `b-${name}`,
    name,
    code: name.slice(0, 3).toUpperCase(),
});

const types = [
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

const equipments = [
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

// ---- COVERAGE-AREAS : site-group (entité plate, pas de hiérarchie) ------
const siteGroups = [
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
const towerTypes = [
    { id: 'tt-1', name: 'Pylône treillis' },
    { id: 'tt-2', name: 'Pylône monopode' },
    { id: 'tt-3', name: 'Pylône haubané' },
];

// ---- COVERAGE-AREAS : mobile-network -------------------------------------
// `infrastructure_type` référence l'uniqId d'un `site-group` (nom trompeur
// mais fidèle au wire du source, cf. plan module-coverage-areas.md Phase 2).
const mobileNetworks = [
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

// ---- administrative-boundary : région → département → commune ----------
// Hiérarchie construite à partir de triplets code/nom ; ids et compteurs
// dérivés pour rester cohérents entre les 3 niveaux.
const regionsSeed = [
    { code: 'MAR', name: 'Maritime' },
    { code: 'PLA', name: 'Plateaux' },
    { code: 'KAR', name: 'Kara' },
];
const departmentsSeed = {
    MAR: [
        { code: 'GLF', name: 'Golfe' },
        { code: 'AVE', name: 'Avé' },
    ],
    PLA: [
        { code: 'OGO', name: 'Ogou' },
        { code: 'HAO', name: 'Haho' },
    ],
    KAR: [
        { code: 'KOZ', name: 'Kozah' },
        { code: 'DAN', name: 'Dankpen' },
    ],
};
const municipalitiesSeed = {
    GLF: [
        { code: 'LOM', name: 'Lomé' },
        { code: 'BAG', name: 'Baguida' },
    ],
    AVE: [
        { code: 'AVK', name: 'Avé Kpéto' },
        { code: 'TOG', name: 'Togoville' },
    ],
    OGO: [
        { code: 'ATA', name: 'Atakpamé' },
        { code: 'AMO', name: 'Amoussoukopé' },
    ],
    HAO: [
        { code: 'NOT', name: 'Notsé' },
        { code: 'KPL', name: 'Kpalimé' },
    ],
    KOZ: [
        { code: 'KAV', name: 'Kara-ville' },
        { code: 'PYA', name: 'Pya' },
    ],
    DAN: [
        { code: 'GUE', name: 'Guérin-Kouka' },
        { code: 'BAP', name: 'Bapuré' },
    ],
};

const regions = regionsSeed.map((r) => ({
    id: nextId(),
    code: r.code,
    name: r.name,
    description: `Région ${r.name}`,
    population_size: 500_000 + Math.floor(Math.random() * 500_000),
    infrastructure_size: 20 + Math.floor(Math.random() * 30),
    is_active: true,
    created_at: now(),
    updated_at: now(),
}));

const departments = regions.flatMap((region) => {
    const seed = regionsSeed.find((r) => r.code === region.code);
    return (departmentsSeed[seed.code] ?? []).map((d) => ({
        id: nextId(),
        code: d.code,
        name: d.name,
        description: `Département ${d.name}`,
        region_id: region.id,
        population_size: 50_000 + Math.floor(Math.random() * 100_000),
        infrastructure_size: 5 + Math.floor(Math.random() * 15),
        is_active: true,
        created_at: now(),
        updated_at: now(),
    }));
});

const municipalities = departments.flatMap((department) =>
    (municipalitiesSeed[department.code] ?? []).map((m) => ({
        id: nextId(),
        code: m.code,
        name: m.name,
        description: `Commune ${m.name}`,
        region_id: department.region_id,
        department_id: department.id,
        population_size: 5_000 + Math.floor(Math.random() * 40_000),
        infrastructure_size: 1 + Math.floor(Math.random() * 8),
        is_active: true,
        created_at: now(),
        updated_at: now(),
    }))
);

// ---- AUTHENTICATION : utilisateur + identifiants seedés -----------------
const MOCK_CREDENTIALS = { email: 'admin@cmz.tg', password: 'Password123!' };
const MOCK_RESET_TOKEN = 'valid-token';

const mockUser = {
    id: 1,
    last_name: 'Admin',
    first_name: 'CMZ',
    email: MOCK_CREDENTIALS.email,
    profile: 'Administrateur',
    phone: '+228 90 00 00 00',
    is_admin: true,
    enable2fa: false,
    status: 'active',
    photo: '',
    permissions: [
        {
            id: 1,
            level: 1,
            title: 'Infrastructures',
            label: 'Infrastructures',
            code: 'INFRASTRUCTURE',
            head_code: 'INFRASTRUCTURE',
            icon: 'building',
            type: 'menu',
            active: true,
        },
    ],
    paths: ['equipments/types', 'territorial-structures/regions'],
    actions: { INFRASTRUCTURE: ['create', 'edit', 'delete'] },
};

const mockToken = () => ({
    value: `mock-token-${nextId()}`,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
});

const boundaryRef = (item) => ({
    id: item.id,
    name: item.name,
    code: item.code,
});

const departmentsCountOf = (regionId) =>
    departments.filter((d) => d.region_id === regionId).length;
const municipalitiesCountOfRegion = (regionId) =>
    municipalities.filter((m) => m.region_id === regionId).length;
const municipalitiesCountOfDepartment = (departmentId) =>
    municipalities.filter((m) => m.department_id === departmentId).length;

const toRegionItem = (r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    description: r.description,
    population_size: r.population_size,
    infrastructure_size: r.infrastructure_size,
    departments_count: departmentsCountOf(r.id),
    municipalities_count: municipalitiesCountOfRegion(r.id),
    is_active: r.is_active,
    created_at: r.created_at,
    updated_at: r.updated_at,
});
const toDepartmentItem = (d) => ({
    id: d.id,
    name: d.name,
    code: d.code,
    description: d.description,
    region: boundaryRef(regions.find((r) => r.id === d.region_id)),
    population_size: d.population_size,
    infrastructure_size: d.infrastructure_size,
    municipalities_count: municipalitiesCountOfDepartment(d.id),
    is_active: d.is_active,
    created_at: d.created_at,
    updated_at: d.updated_at,
});
const toDepartmentsByRegionIdItem = (d) => ({
    id: d.id,
    name: d.name,
    code: d.code,
    description: d.description,
    population_size: d.population_size,
    municipalities_count: municipalitiesCountOfDepartment(d.id),
    is_active: d.is_active,
    created_at: d.created_at,
    updated_at: d.updated_at,
});
const toMunicipalityItem = (m) => ({
    id: m.id,
    name: m.name,
    code: m.code,
    description: m.description,
    region: boundaryRef(regions.find((r) => r.id === m.region_id)),
    department: boundaryRef(departments.find((d) => d.id === m.department_id)),
    population_size: m.population_size,
    infrastructure_size: m.infrastructure_size,
    is_active: m.is_active,
    created_at: m.created_at,
    updated_at: m.updated_at,
});
const toMunicipalitiesByDepartmentIdItem = (m) => ({
    id: m.id,
    name: m.name,
    code: m.code,
    description: m.description,
    population_size: m.population_size,
    is_active: m.is_active,
    created_at: m.created_at,
    updated_at: m.updated_at,
});

// ---------------------------------------------------------------- helpers
const ok = (data, message = '') => ({ error: false, message, data });
const fail = (message) => ({ error: true, message, data: null });

function paginate(items, pageStr) {
    const page = Math.max(1, Number(pageStr) || 1);
    const total = items.length;
    const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
    const start = (page - 1) * PER_PAGE;
    const data = items.slice(start, start + PER_PAGE);
    return {
        current_page: page,
        data,
        first_page_url: '',
        last_page: lastPage,
        last_page_url: '',
        next_page_url: null,
        prev_page_url: null,
        path: '',
        per_page: PER_PAGE,
        from: start + 1,
        to: start + data.length,
        total,
        links: [],
    };
}

function send(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    });
    res.end(payload);
}

const readBody = (req) =>
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

// Normalise : on ignore le préfixe (/api/settings/…) et on matche la ressource.
const rel = (pathname) => {
    for (const marker of [
        'infrastructures/',
        'territorial-structures/',
        'auth/',
    ]) {
        const i = pathname.indexOf(marker);
        if (i >= 0) return pathname.slice(i);
    }
    return pathname.replace(/^\/+/, '');
};

// ---------------------------------------------------------------- routes
async function handle(req, res, url) {
    const method = req.method ?? 'GET';
    if (method === 'OPTIONS') return send(res, 204, {});

    const path = rel(url.pathname);
    const page = url.searchParams.get('page');

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
    let m = path.match(/^infrastructures\/equipment-types\/(.+)$/);
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

    // ---- ADMINISTRATIVE-BOUNDARY : REGIONS ----
    if (path === 'territorial-structures/regions' && method === 'GET') {
        return send(
            res,
            200,
            ok(paginate(regions.map(toRegionItem), page ?? '1'))
        );
    }
    if (
        path === 'territorial-structures/regions/selected-field' &&
        method === 'GET'
    ) {
        return send(
            res,
            200,
            ok(
                regions.map((r) => ({
                    id: r.id,
                    name: r.name,
                    code: r.code,
                    departments: departments
                        .filter((d) => d.region_id === r.id)
                        .map((d) => ({
                            id: d.id,
                            name: d.name,
                            code: d.code,
                            municipalities: municipalities
                                .filter((m) => m.department_id === d.id)
                                .map((m) => ({
                                    id: m.id,
                                    name: m.name,
                                    code: m.code,
                                })),
                        })),
                }))
            )
        );
    }
    if (path === 'territorial-structures/regions/store' && method === 'POST') {
        const b = await readBody(req);
        regions.unshift({
            id: nextId(),
            code: b.code,
            name: b.name,
            description: b.description ?? '',
            population_size: Number(b.population_size) || 0,
            infrastructure_size: Number(b.infrastructure_size) || 0,
            is_active: true,
            created_at: now(),
            updated_at: now(),
        });
        return send(res, 201, ok(null, 'Région créée.'));
    }
    m = path.match(/^territorial-structures\/regions\/(.+)$/);
    if (m) {
        const seg = m[1];
        const id = seg.split('/')[0];
        const region = regions.find((r) => r.id === id);
        if (seg === `${id}/departments` && method === 'GET') {
            const scoped = departments.filter((d) => d.region_id === id);
            return send(
                res,
                200,
                ok(
                    paginate(
                        scoped.map(toDepartmentsByRegionIdItem),
                        page ?? '1'
                    )
                )
            );
        }
        if (seg === `${id}/update` && method === 'POST') {
            const b = await readBody(req);
            if (region)
                Object.assign(region, {
                    code: b.code,
                    name: b.name,
                    description: b.description ?? '',
                    population_size: Number(b.population_size) || 0,
                    infrastructure_size: Number(b.infrastructure_size) || 0,
                    updated_at: now(),
                });
            return send(res, 200, ok(null, 'Région mise à jour.'));
        }
        if (seg === `${id}/delete` && method === 'DELETE') {
            const i = regions.findIndex((r) => r.id === id);
            if (i >= 0) regions.splice(i, 1);
            return send(res, 200, ok(null, 'Région supprimée.'));
        }
        if (seg === id && method === 'GET') {
            return region
                ? send(res, 200, ok(toRegionItem(region)))
                : send(res, 404, fail('Région introuvable.'));
        }
    }

    // ---- ADMINISTRATIVE-BOUNDARY : DEPARTMENTS ----
    if (path === 'territorial-structures/departments' && method === 'GET') {
        const regionId = url.searchParams.get('region_id');
        const scoped = regionId
            ? departments.filter((d) => d.region_id === regionId)
            : departments;
        return send(
            res,
            200,
            ok(paginate(scoped.map(toDepartmentItem), page ?? '1'))
        );
    }
    if (
        path === 'territorial-structures/departments/selected-field' &&
        method === 'GET'
    ) {
        return send(
            res,
            200,
            ok(
                departments.map((d) => ({
                    id: d.id,
                    name: d.name,
                    code: d.code,
                    municipalities: municipalities
                        .filter((m) => m.department_id === d.id)
                        .map((m) => ({
                            id: m.id,
                            name: m.name,
                            code: m.code,
                        })),
                }))
            )
        );
    }
    if (
        path === 'territorial-structures/departments/store' &&
        method === 'POST'
    ) {
        const b = await readBody(req);
        departments.push({
            id: nextId(),
            code: b.code,
            name: b.name,
            description: b.description ?? '',
            region_id: b.region_id,
            population_size: Number(b.population_size) || 0,
            infrastructure_size: Number(b.infrastructure_size) || 0,
            is_active: true,
            created_at: now(),
            updated_at: now(),
        });
        return send(res, 201, ok(null, 'Département créé.'));
    }
    m = path.match(/^territorial-structures\/departments\/(.+)$/);
    if (m) {
        const seg = m[1];
        const id = seg.split('/')[0];
        const department = departments.find((d) => d.id === id);
        if (seg === `${id}/municipalities` && method === 'GET') {
            const scoped = municipalities.filter(
                (mu) => mu.department_id === id
            );
            return send(
                res,
                200,
                ok(
                    paginate(
                        scoped.map(toMunicipalitiesByDepartmentIdItem),
                        page ?? '1'
                    )
                )
            );
        }
        if (seg === `${id}/update` && method === 'POST') {
            const b = await readBody(req);
            if (department)
                Object.assign(department, {
                    code: b.code,
                    name: b.name,
                    description: b.description ?? '',
                    region_id: b.region_id ?? department.region_id,
                    population_size: Number(b.population_size) || 0,
                    infrastructure_size: Number(b.infrastructure_size) || 0,
                    updated_at: now(),
                });
            return send(res, 200, ok(null, 'Département mis à jour.'));
        }
        if (seg === `${id}/delete` && method === 'DELETE') {
            const i = departments.findIndex((d) => d.id === id);
            if (i >= 0) departments.splice(i, 1);
            return send(res, 200, ok(null, 'Département supprimé.'));
        }
        if (seg === id && method === 'GET') {
            return department
                ? send(res, 200, ok(toDepartmentItem(department)))
                : send(res, 404, fail('Département introuvable.'));
        }
    }

    // ---- ADMINISTRATIVE-BOUNDARY : MUNICIPALITIES ----
    if (path === 'territorial-structures/municipalities' && method === 'GET') {
        const regionId = url.searchParams.get('region_id');
        const departmentId = url.searchParams.get('department_id');
        let scoped = municipalities;
        if (regionId) scoped = scoped.filter((m) => m.region_id === regionId);
        if (departmentId)
            scoped = scoped.filter((m) => m.department_id === departmentId);
        return send(
            res,
            200,
            ok(paginate(scoped.map(toMunicipalityItem), page ?? '1'))
        );
    }
    if (
        path === 'territorial-structures/municipalities/store' &&
        method === 'POST'
    ) {
        const b = await readBody(req);
        municipalities.push({
            id: nextId(),
            code: b.code,
            name: b.name,
            description: b.description ?? '',
            region_id: b.region_id,
            department_id: b.department_id,
            population_size: Number(b.population_size) || 0,
            infrastructure_size: Number(b.infrastructure_size) || 0,
            is_active: true,
            created_at: now(),
            updated_at: now(),
        });
        return send(res, 201, ok(null, 'Commune créée.'));
    }
    m = path.match(/^territorial-structures\/municipalities\/(.+)$/);
    if (m) {
        const seg = m[1];
        const id = seg.split('/')[0];
        const municipality = municipalities.find((mu) => mu.id === id);
        if (seg === `${id}/update` && method === 'POST') {
            const b = await readBody(req);
            if (municipality)
                Object.assign(municipality, {
                    code: b.code,
                    name: b.name,
                    description: b.description ?? '',
                    region_id: b.region_id ?? municipality.region_id,
                    department_id:
                        b.department_id ?? municipality.department_id,
                    population_size: Number(b.population_size) || 0,
                    infrastructure_size: Number(b.infrastructure_size) || 0,
                    updated_at: now(),
                });
            return send(res, 200, ok(null, 'Commune mise à jour.'));
        }
        if (seg === `${id}/delete` && method === 'DELETE') {
            const i = municipalities.findIndex((mu) => mu.id === id);
            if (i >= 0) municipalities.splice(i, 1);
            return send(res, 200, ok(null, 'Commune supprimée.'));
        }
        if (seg === id && method === 'GET') {
            return municipality
                ? send(res, 200, ok(toMunicipalityItem(municipality)))
                : send(res, 404, fail('Commune introuvable.'));
        }
    }

    // ---- AUTHENTICATION ----
    if (path === 'auth/login' && method === 'POST') {
        const b = await readBody(req);
        const valid =
            b.email === MOCK_CREDENTIALS.email &&
            b.password === MOCK_CREDENTIALS.password;
        if (!valid) {
            return send(res, 200, fail('Email ou mot de passe incorrect.'));
        }
        return send(
            res,
            200,
            ok({
                user: mockUser,
                token: mockToken(),
                message: 'Connexion réussie.',
            })
        );
    }
    if (path === 'auth/forgot-password' && method === 'POST') {
        // Anti-enumeration : message générique, que l'email existe ou non.
        return send(
            res,
            200,
            ok({
                message:
                    'Si un compte existe pour cet email, un lien de réinitialisation vient de lui être envoyé.',
            })
        );
    }
    if (path === 'auth/reset-password' && method === 'POST') {
        const b = await readBody(req);
        if (b.token !== MOCK_RESET_TOKEN) {
            return send(
                res,
                200,
                fail('Lien de réinitialisation invalide ou expiré.')
            );
        }
        return send(
            res,
            200,
            ok({ message: 'Mot de passe réinitialisé avec succès.' })
        );
    }

    return send(res, 404, fail(`Mock: route non gérée (${method} ${path}).`));
}

createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
    handle(req, res, url).catch((e) => send(res, 500, fail(String(e))));
}).listen(PORT, () => {
    console.log(
        `🧪 Mock backend cmz sur http://localhost:${PORT} (proxy /api → ici)`
    );
});
