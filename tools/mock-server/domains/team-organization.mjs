import { fail, ok, readBody, readFormData, send } from '../http.mjs';
import { nextId, now } from '../ids.mjs';
import { paginate, paginateAll } from '../paginate.mjs';

// ---- TEAM-ORGANIZATION : teams --------------------------------------------
// `permission_values` : ids (dans l'arbre ci-dessous) cochés pour cette
// équipe — sert à construire `permissions_json` du détail (find-one).
export const PERMISSION_TREE = [
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
export function buildPermissionsTree(checked) {
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

export const teams = [
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

export const toTeamsListItem = (t) => ({
    uniq_id: t.id,
    code: t.code,
    name: t.name,
    slug: t.slug,
    description: t.description,
    members_count: t.members_count,
    is_active: t.is_active,
    updated_at: t.updated_at,
});

export const toTeamsFindOneItem = (t) => ({
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
export const teamRef = (teamId) => {
    const t = teams.find((team) => team.id === teamId);
    return t ? { id: t.id, uniq_id: t.id, name: t.name } : null;
};

export const participants = [
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

export const toParticipantsListItem = (p) => ({
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

export const toParticipantsFindOneItem = (p) => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    email: p.email,
    phone: p.phone,
    role: p.role,
    team: teamRef(p.team_id),
    updated_at: p.updated_at,
});


/**
 * @param {{ path: string, method: string, req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, page: string | null, url: URL }} ctx
 * @returns {Promise<boolean|void>|boolean|void} truthy si la route a été servie
 */
export async function handle(ctx) {
    const { path, method, req, res, page, url } = ctx;
    let m;
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
    return false;
}
