#!/usr/bin/env node
/**
 * Mock backend **léger, zéro-dépendance** (Node http) pour le dev.
 *
 * Sert les endpoints des modules `administrative-infrastructure`,
 * `administrative-boundary`, `authentication`, `coverage-areas`
 * (`site-group`, `mobile-network`, `optical-fiber-network`,
 * `radio-relay-links`, entités plates — même forme que
 * `infrastructure-types` ; `tower-type`/`fiber-constructor`, select seul) et
 * `team-organization` (`participants`, `teams` — `teams` a en plus un select
 * (`select-field`) et un arbre de permissions aplati côté domaine
 * (`get-permissions-model` en création, `permissions_json` embarqué dans le
 * détail en édition) avec l'enveloppe attendue par le kernel
 * (`{ error, message, data }`) et la forme de pagination Laravel
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

// ---- COVERAGE-AREAS : fiber-constructor (select seul, pas de CRUD) ------
const fiberConstructors = [
    { id: 'fc-1', name: 'Huawei' },
    { id: 'fc-2', name: 'Nokia' },
    { id: 'fc-3', name: 'ZTE' },
];

// ---- COVERAGE-AREAS : optical-fiber-network ------------------------------
// `geom_url` simule un fichier déjà stocké (jamais le binaire lui-même,
// cf. `readFormData`).
const opticalFiberNetworks = [
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
const radioRelayLinks = [
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

// ---- TEAM-ORGANIZATION : teams --------------------------------------------
// `permission_values` : ids (dans l'arbre ci-dessous) cochés pour cette
// équipe — sert à construire `permissions_json` du détail (find-one).
const PERMISSION_TREE = [
    {
        value: '1',
        title: 'Infrastructures',
        children: [
            { value: '11', title: 'Créer' },
            { value: '12', title: 'Modifier' },
            { value: '13', title: 'Supprimer' },
        ],
    },
    {
        value: '2',
        title: 'Rapports',
        children: [
            { value: '21', title: 'Voir' },
            { value: '22', title: 'Exporter' },
        ],
    },
    {
        value: '3',
        title: 'Équipes',
        children: [{ value: '31', title: 'Gérer les membres' }],
    },
];

/** Clone l'arbre statique en cochant les `value` présents dans `checked`. */
function buildPermissionsTree(checked) {
    const checkedSet = new Set(checked ?? []);
    const clone = (node) => ({
        data: {
            value: node.value,
            title: node.title,
            checked: checkedSet.has(node.value),
        },
        children: (node.children ?? []).map(clone),
    });
    return PERMISSION_TREE.map(clone);
}

const teams = [
    {
        id: 'team-1',
        code: 'TEAM-LOM',
        name: 'Équipe Lomé',
        slug: 'equipe-lome',
        description: 'Équipe opérationnelle du centre-ville de Lomé',
        report_types: ['abi', 'zob'],
        operators: ['mtn', 'orange'],
        permission_values: ['11', '12', '21'],
        members_count: '3',
        is_active: true,
        updated_at: now(),
    },
    {
        id: 'team-2',
        code: 'TEAM-KAR',
        name: 'Équipe Kara',
        slug: 'equipe-kara',
        description: 'Équipe de supervision de la région de Kara',
        report_types: ['cps', 'cpo'],
        operators: ['moov'],
        permission_values: ['21', '22'],
        members_count: '1',
        is_active: false,
        updated_at: now(),
    },
    {
        id: 'team-3',
        code: 'TEAM-MAR',
        name: 'Équipe Maritime',
        slug: 'equipe-maritime',
        description: 'Équipe de la région Maritime',
        report_types: ['abi'],
        operators: ['mtn', 'orange', 'moov'],
        permission_values: ['11', '31'],
        members_count: '0',
        is_active: true,
        updated_at: now(),
    },
];

const toTeamsListItem = (t) => ({
    uniq_id: t.id,
    code: t.code,
    name: t.name,
    slug: t.slug,
    description: t.description,
    members_count: t.members_count,
    is_active: t.is_active,
    updated_at: t.updated_at,
});

const toTeamsFindOneItem = (t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    description: t.description,
    report_types: t.report_types,
    operators: t.operators,
    permissions_json: buildPermissionsTree(t.permission_values),
});

// ---- TEAM-ORGANIZATION : participants -------------------------------------
// `team` en réponse est un objet `{id, uniq_id, name}` (`SelectDto`) — le
// mapper source en dérive soit le nom (liste) soit l'uniqId (détail).
const teamRef = (teamId) => {
    const t = teams.find((team) => team.id === teamId);
    return t ? { id: t.id, uniq_id: t.id, name: t.name } : null;
};

const participants = [
    {
        id: 'part-1',
        first_name: 'Ama',
        last_name: 'Koffi',
        email: 'ama.koffi@cmz.tg',
        phone: '+228 90 11 22 33',
        role: 'team-leader',
        team_id: 'team-1',
        status: 'active',
        created_at: now(),
        updated_at: now(),
    },
    {
        id: 'part-2',
        first_name: 'Kodjo',
        last_name: 'Mensah',
        email: 'kodjo.mensah@cmz.tg',
        phone: '+228 91 22 33 44',
        role: 'agent',
        team_id: 'team-1',
        status: 'pending',
        created_at: now(),
        updated_at: now(),
    },
    {
        id: 'part-3',
        first_name: 'Afi',
        last_name: 'Adjovi',
        email: 'afi.adjovi@cmz.tg',
        phone: '+228 92 33 44 55',
        role: 'supervisor',
        team_id: 'team-2',
        status: 'blocked',
        created_at: now(),
        updated_at: now(),
    },
    {
        id: 'part-4',
        first_name: 'Yao',
        last_name: 'Agbeko',
        email: 'yao.agbeko@cmz.tg',
        phone: '+228 93 44 55 66',
        role: 'agent',
        team_id: null,
        status: 'inactive',
        created_at: now(),
        updated_at: now(),
    },
];

const toParticipantsListItem = (p) => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    email: p.email,
    phone: p.phone,
    role: p.role,
    team: teamRef(p.team_id),
    status: p.status,
    created_at: p.created_at,
    updated_at: p.updated_at,
});

const toParticipantsFindOneItem = (p) => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    email: p.email,
    phone: p.phone,
    role: p.role,
    team: teamRef(p.team_id),
    updated_at: p.updated_at,
});

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

/**
 * Parseur `multipart/form-data` minimal — nécessaire pour `optical-fiber-network`
 * (`create`/`update` envoient un `FormData` via `buildFormData`, cf.
 * `@cmz/shared-data`, à cause de l'upload `geom_file`). Ne stocke pas le
 * contenu binaire du fichier : seul le nom du fichier est capturé (suffisant
 * pour un mock — le contrat testé est « un fichier a bien été envoyé », pas
 * son contenu).
 */
const readFormData = (req) =>
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

    // ---- TEAM-ORGANIZATION : TEAMS ----
    // routes statiques (`select-field`, `get-permissions-model`) déclarées
    // AVANT la regex générique `/teams/(.+)` — même base path, plus
    // spécifique doit gagner.
    if (
        path === 'auth/teams-organization/teams/select-field' &&
        method === 'GET'
    ) {
        return send(
            res,
            200,
            ok(
                teams.map((t) => ({
                    uniq_id: t.id,
                    name: t.name,
                    code: t.code,
                }))
            )
        );
    }
    if (
        path === 'auth/teams-organization/teams/get-permissions-model' &&
        method === 'GET'
    ) {
        return send(res, 200, ok(buildPermissionsTree([])));
    }
    if (path === 'auth/teams-organization/teams' && method === 'GET') {
        return send(
            res,
            200,
            ok(paginate(teams.map(toTeamsListItem), page ?? '1'))
        );
    }
    if (path === 'auth/teams-organization/teams/store' && method === 'POST') {
        const b = await readBody(req);
        teams.unshift({
            id: nextId(),
            code: b.code ?? '',
            name: b.name,
            slug: (b.name ?? '').toLowerCase().replace(/\s+/g, '-'),
            description: b.description ?? '',
            report_types: b.report_types ?? [],
            operators: b.operators ?? [],
            permission_values: (b.permissions ?? []).map(String),
            members_count: '0',
            is_active: false,
            updated_at: now(),
        });
        return send(res, 201, ok(null, 'Équipe créée.'));
    }
    m = path.match(/^auth\/teams-organization\/teams\/(.+)$/);
    if (m) {
        const seg = m[1];
        const id = seg.split('/')[0];
        const item = teams.find((t) => t.id === id);
        if (seg === `${id}/update` && method === 'POST') {
            const b = await readBody(req);
            if (item) {
                Object.assign(item, {
                    name: b.name,
                    description: b.description,
                    report_types: b.report_types ?? item.report_types,
                    operators: b.operators ?? item.operators,
                    permission_values: b.permissions
                        ? b.permissions.map(String)
                        : item.permission_values,
                    updated_at: now(),
                });
            }
            return send(res, 200, ok(null, 'Équipe mise à jour.'));
        }
        if (seg === `${id}/delete` && method === 'DELETE') {
            const i = teams.findIndex((t) => t.id === id);
            if (i >= 0) teams.splice(i, 1);
            return send(res, 200, ok(null, 'Équipe supprimée.'));
        }
        if (seg === `${id}/enable` && method === 'PUT') {
            if (item) item.is_active = true;
            return send(res, 200, ok(null, 'Équipe activée.'));
        }
        if (seg === `${id}/disable` && method === 'PUT') {
            if (item) item.is_active = false;
            return send(res, 200, ok(null, 'Équipe désactivée.'));
        }
        if (method === 'GET') {
            return item
                ? send(res, 200, ok(toTeamsFindOneItem(item)))
                : send(res, 404, fail('Équipe introuvable.'));
        }
    }

    // ---- TEAM-ORGANIZATION : PARTICIPANTS ----
    if (path === 'auth/teams-organization/members' && method === 'GET') {
        return send(
            res,
            200,
            ok(paginate(participants.map(toParticipantsListItem), page ?? '1'))
        );
    }
    if (path === 'auth/teams-organization/members/store' && method === 'POST') {
        const b = await readBody(req);
        participants.unshift({
            id: nextId(),
            first_name: b.first_name,
            last_name: b.last_name,
            email: b.email,
            phone: b.phone_number,
            role: b.role ?? null,
            team_id: b.team_uniq_id ?? null,
            status: 'pending',
            created_at: now(),
            updated_at: now(),
        });
        return send(res, 201, ok(null, 'Participant créé.'));
    }
    m = path.match(/^auth\/teams-organization\/members\/(.+)$/);
    if (m) {
        const seg = m[1];
        const id = seg.split('/')[0];
        const item = participants.find((p) => p.id === id);
        if (seg === `${id}/update` && method === 'POST') {
            const b = await readBody(req);
            if (item) {
                Object.assign(item, {
                    first_name: b.first_name,
                    last_name: b.last_name,
                    email: b.email,
                    phone: b.phone_number,
                    role: b.role ?? item.role,
                    team_id:
                        b.team_uniq_id !== undefined
                            ? b.team_uniq_id
                            : item.team_id,
                    updated_at: now(),
                });
            }
            return send(res, 200, ok(null, 'Participant mis à jour.'));
        }
        if (seg === `${id}/delete` && method === 'DELETE') {
            const i = participants.findIndex((p) => p.id === id);
            if (i >= 0) participants.splice(i, 1);
            return send(res, 200, ok(null, 'Participant supprimé.'));
        }
        if (seg === `${id}/enable` && method === 'PUT') {
            if (item) item.status = 'active';
            return send(res, 200, ok(null, 'Participant activé.'));
        }
        if (seg === `${id}/disable` && method === 'PUT') {
            if (item) item.status = 'inactive';
            return send(res, 200, ok(null, 'Participant désactivé.'));
        }
        if (method === 'GET') {
            return item
                ? send(res, 200, ok(toParticipantsFindOneItem(item)))
                : send(res, 404, fail('Participant introuvable.'));
        }
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
