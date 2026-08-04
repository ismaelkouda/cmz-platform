import { fail, ok, readBody, readFormData, send } from '../http.mjs';
import { nextId, now } from '../ids.mjs';
import { paginate, paginateAll } from '../paginate.mjs';

// ---- SETTINGS-SECURITY : profiles-permissions (arbre AVEC actions) -------
// Contrairement à `PERMISSION_TREE` (team-organization, aplati), chaque
// nœud ici porte les 6 clés `PermissionAction` du kernel
// (read/write/execute/export/delete/approve). `permission_values` d'un
// profil est la map plate `{[nodeKey]: actionName[]}` — même forme que le
// DTO d'écriture (`ProfilesPermissionsCreateApiDto.permissions`), pas de
// transformation : `buildPermissionsActionsTree` la reclone en arbre pour
// la lecture (find-one + get-permissions-model).
export const PERMISSION_ACTION_KEYS = [
    'read',
    'write',
    'execute',
    'export',
    'delete',
    'approve',
];

export const PERMISSION_ACTIONS_TREE = [
    {
        key: 'infrastructures',
        title: 'Infrastructures',
        children: [
            { key: 'infrastructures.types', title: "Types d'équipements" },
            { key: 'infrastructures.equipments', title: 'Équipements' },
        ],
    },
    {
        key: 'territorial-structures',
        title: 'Structures territoriales',
        children: [
            { key: 'territorial-structures.regions', title: 'Régions' },
            {
                key: 'territorial-structures.departments',
                title: 'Départements',
            },
            {
                key: 'territorial-structures.municipalities',
                title: 'Communes',
            },
        ],
    },
    {
        key: 'coverage-areas',
        title: 'Zones de couverture',
        children: [
            { key: 'coverage-areas.site-groups', title: 'Groupes de sites' },
            {
                key: 'coverage-areas.mobile-networks',
                title: 'Réseaux mobiles',
            },
        ],
    },
    {
        key: 'team-organization',
        title: 'Organisation des équipes',
        children: [
            { key: 'team-organization.teams', title: 'Équipes' },
            { key: 'team-organization.participants', title: 'Participants' },
        ],
    },
    {
        key: 'content-management',
        title: 'Gestion de contenu',
        children: [
            { key: 'content-management.news', title: 'Actualités' },
            { key: 'content-management.home', title: 'Accueil' },
        ],
    },
    {
        key: 'settings-security',
        title: 'Paramètres & sécurité',
        children: [
            { key: 'settings-security.users', title: 'Utilisateurs' },
            {
                key: 'settings-security.profiles-permissions',
                title: 'Profils & permissions',
            },
        ],
    },
];

export function blankPermissionActions() {
    return Object.fromEntries(PERMISSION_ACTION_KEYS.map((a) => [a, false]));
}

/** Clone l'arbre statique en cochant les actions présentes dans `grantedMap` (`{[nodeKey]: actionName[]}`). */
export function buildPermissionsActionsTree(grantedMap) {
    const granted = grantedMap ?? {};
    const clone = (node) => {
        const grantedActions = granted[node.key] ?? [];
        const actions = blankPermissionActions();
        grantedActions.forEach((a) => {
            if (a in actions) actions[a] = true;
        });
        return {
            data: {
                value: node.key,
                title: node.title,
                checked: grantedActions.length > 0,
                actions,
            },
            children: (node.children ?? []).map(clone),
        };
    };
    return PERMISSION_ACTIONS_TREE.map(clone);
}

export const profilesPermissions = [
    {
        id: 'profile-1',
        name: 'Superviseur',
        slug: 'superviseur',
        description: 'Accès complet à la plateforme.',
        users_count: '2',
        is_active: true,
        created_at: now(),
        updated_at: now(),
        permission_values: {
            infrastructures: ['read', 'write', 'delete'],
            'infrastructures.types': ['read', 'write'],
            'infrastructures.equipments': ['read', 'write', 'delete'],
            'settings-security.users': ['read', 'write', 'delete', 'approve'],
            'settings-security.profiles-permissions': ['read', 'write'],
        },
    },
    {
        id: 'profile-2',
        name: 'Agent terrain',
        slug: 'agent-terrain',
        description: 'Accès limité en lecture/écriture sur le terrain.',
        users_count: '5',
        is_active: true,
        created_at: now(),
        updated_at: now(),
        permission_values: {
            'infrastructures.equipments': ['read'],
            'coverage-areas.site-groups': ['read'],
        },
    },
    {
        id: 'profile-3',
        name: 'Lecture seule',
        slug: 'lecture-seule',
        description: 'Consultation uniquement, aucune modification.',
        users_count: '0',
        is_active: false,
        created_at: now(),
        updated_at: now(),
        permission_values: {},
    },
];

export const toProfilesPermissionsListItem = (p) => ({
    uniq_id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    users_count: p.users_count,
    is_active: p.is_active,
    created_at: p.created_at,
    updated_at: p.updated_at,
});

export const toProfilesPermissionsFindOneItem = (p) => ({
    uniq_id: p.id,
    name: p.name,
    description: p.description,
    permissions: buildPermissionsActionsTree(p.permission_values),
});

// ---- SETTINGS-SECURITY : users --------------------------------------------
// `profile_id` référence `profilesPermissions` — `profile` (liste) en
// dérive le NOM, `profile_id` (détail) reste l'id, même précédent que
// `participants.team`/`teamRef` ci-dessus.
export const users = [
    {
        id: 'user-1',
        first_name: 'Ama',
        last_name: 'Koffi',
        email: 'ama.koffi@cmz.tg',
        phone: '+228 90 01 02 03',
        profile_id: 'profile-1',
        role: 'supervisor',
        status: 'active',
        created_at: now(),
        updated_at: now(),
    },
    {
        id: 'user-2',
        first_name: 'Yao',
        last_name: 'Mensah',
        email: 'yao.mensah@cmz.tg',
        phone: '+228 90 11 12 13',
        profile_id: 'profile-2',
        role: 'team-leader',
        status: 'active',
        created_at: now(),
        updated_at: now(),
    },
    {
        id: 'user-3',
        first_name: 'Kodjo',
        last_name: 'Adjo',
        email: 'kodjo.adjo@cmz.tg',
        phone: '+228 90 21 22 23',
        profile_id: 'profile-2',
        role: 'agent',
        status: 'pending',
        created_at: now(),
        updated_at: now(),
    },
    {
        id: 'user-4',
        first_name: 'Efua',
        last_name: 'Dogbe',
        email: 'efua.dogbe@cmz.tg',
        phone: '+228 90 31 32 33',
        profile_id: 'profile-3',
        role: 'agent',
        status: 'blocked',
        created_at: now(),
        updated_at: now(),
    },
];

export const toUsersListItem = (u) => {
    const profile = profilesPermissions.find((p) => p.id === u.profile_id);
    return {
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        phone: u.phone,
        profile: profile ? profile.name : '',
        role: u.role,
        status: u.status,
        created_at: u.created_at,
        updated_at: u.updated_at,
    };
};

export const toUsersFindOneItem = (u) => ({
    id: u.id,
    first_name: u.first_name,
    last_name: u.last_name,
    email: u.email,
    phone: u.phone,
    profile_id: u.profile_id,
    role: u.role,
    created_at: u.created_at,
    updated_at: u.updated_at,
});

// ---- SETTINGS-SECURITY : access-logs (lecture seule) ----------------------
// Champs déjà identiques au wire (`AccessLogsItemApiDto`) — pas besoin de
// mapper dédié, `paginate(accessLogs, page)` suffit.
export const accessLogs = [
    {
        id: 'log-1',
        action: 'login',
        source: '41.207.12.10',
        used_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        created_at: now(),
    },
    {
        id: 'log-2',
        action: 'logout',
        source: '41.207.12.10',
        used_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        created_at: now(),
    },
    {
        id: 'log-3',
        action: 'attempted_login',
        source: '196.168.4.22',
        used_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        created_at: now(),
    },
    {
        id: 'log-4',
        action: 'blocked_attempted_login',
        source: '196.168.4.22',
        used_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        created_at: now(),
    },
    {
        id: 'log-5',
        action: 'attempts_exceeded',
        source: '102.65.33.9',
        used_agent: 'Mozilla/5.0 (Linux; Android 12)',
        created_at: now(),
    },
];


/**
 * @param {{ path: string, method: string, req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, page: string | null, url: URL }} ctx
 * @returns {Promise<boolean|void>|boolean|void} truthy si la route a été servie
 */
export async function handle(ctx) {
    const { path, method, req, res, page, url } = ctx;
    let m;
    // ---- SETTINGS-SECURITY : USERS ----
    if (path === 'settings-and-security/users' && method === 'GET') {
        return send(
            res,
            200,
            ok(paginate(users.map(toUsersListItem), page ?? '1'))
        );
    }
    if (path === 'settings-and-security/users/store' && method === 'POST') {
        const b = await readBody(req);
        users.unshift({
            id: nextId(),
            first_name: b.first_name ?? '',
            last_name: b.last_name ?? '',
            email: b.email ?? '',
            phone: b.phone ?? '',
            profile_id: b.profile_id ?? '',
            role: null,
            status: 'pending',
            created_at: now(),
            updated_at: now(),
        });
        return send(res, 201, ok(null, 'Utilisateur créé.'));
    }
    m = path.match(/^settings-and-security\/users\/(.+)$/);
    if (m) {
        const seg = m[1];
        const id = seg.split('/')[0];
        const user = users.find((u) => u.id === id);
        if (seg === `${id}/update` && method === 'POST') {
            const b = await readBody(req);
            if (user) {
                Object.assign(user, {
                    first_name: b.first_name ?? user.first_name,
                    last_name: b.last_name ?? user.last_name,
                    email: b.email ?? user.email,
                    phone: b.phone ?? user.phone,
                    profile_id: b.profile_id ?? user.profile_id,
                    updated_at: now(),
                });
            }
            return send(res, 200, ok(null, 'Utilisateur mis à jour.'));
        }
        if (seg === `${id}/delete` && method === 'DELETE') {
            const i = users.findIndex((u) => u.id === id);
            if (i >= 0) users.splice(i, 1);
            return send(res, 200, ok(null, 'Utilisateur supprimé.'));
        }
        if (seg === `${id}/enable` && method === 'PUT') {
            if (user) user.status = 'active';
            return send(res, 200, ok(null, 'Utilisateur activé.'));
        }
        if (seg === `${id}/disable` && method === 'PUT') {
            if (user) user.status = 'inactive';
            return send(res, 200, ok(null, 'Utilisateur désactivé.'));
        }
        if (method === 'GET') {
            return user
                ? send(res, 200, ok(toUsersFindOneItem(user)))
                : send(res, 404, fail('Utilisateur introuvable.'));
        }
    }

    // ---- SETTINGS-SECURITY : PROFILES-PERMISSIONS ----
    // routes statiques (`select-field`, `get-permissions-model`) déclarées
    // AVANT la regex générique — même précédent que
    // `auth/teams-organization/teams` ci-dessus.
    if (
        path === 'settings-and-security/user-profiles/select-field' &&
        method === 'GET'
    ) {
        return send(
            res,
            200,
            ok(
                profilesPermissions.map((p) => ({
                    uniq_id: p.id,
                    name: p.name,
                }))
            )
        );
    }
    if (
        path === 'settings-and-security/user-profiles/get-permissions-model' &&
        method === 'GET'
    ) {
        return send(res, 200, ok(buildPermissionsActionsTree({})));
    }
    if (path === 'settings-and-security/user-profiles' && method === 'GET') {
        return send(
            res,
            200,
            ok(
                paginate(
                    profilesPermissions.map(toProfilesPermissionsListItem),
                    page ?? '1'
                )
            )
        );
    }
    if (
        path === 'settings-and-security/user-profiles/store' &&
        method === 'POST'
    ) {
        const b = await readBody(req);
        profilesPermissions.unshift({
            id: nextId(),
            name: b.name ?? '',
            slug: (b.name ?? '').toLowerCase().replace(/\s+/g, '-'),
            description: b.description ?? '',
            users_count: '0',
            is_active: false,
            created_at: now(),
            updated_at: now(),
            permission_values: b.permissions ?? {},
        });
        return send(res, 201, ok(null, 'Profil créé.'));
    }
    m = path.match(/^settings-and-security\/user-profiles\/(.+)$/);
    if (m) {
        const seg = m[1];
        const id = seg.split('/')[0];
        const profile = profilesPermissions.find((p) => p.id === id);
        if (seg === `${id}/update` && method === 'POST') {
            const b = await readBody(req);
            if (profile) {
                Object.assign(profile, {
                    name: b.name ?? profile.name,
                    description: b.description ?? profile.description,
                    permission_values:
                        b.permissions ?? profile.permission_values,
                    updated_at: now(),
                });
            }
            return send(res, 200, ok(null, 'Profil mis à jour.'));
        }
        if (seg === `${id}/delete` && method === 'DELETE') {
            const i = profilesPermissions.findIndex((p) => p.id === id);
            if (i >= 0) profilesPermissions.splice(i, 1);
            return send(res, 200, ok(null, 'Profil supprimé.'));
        }
        if (seg === `${id}/enable` && method === 'PUT') {
            if (profile) profile.is_active = true;
            return send(res, 200, ok(null, 'Profil activé.'));
        }
        if (seg === `${id}/disable` && method === 'PUT') {
            if (profile) profile.is_active = false;
            return send(res, 200, ok(null, 'Profil désactivé.'));
        }
        if (method === 'GET') {
            return profile
                ? send(res, 200, ok(toProfilesPermissionsFindOneItem(profile)))
                : send(res, 404, fail('Profil introuvable.'));
        }
    }

    // ---- SETTINGS-SECURITY : ACCESS-LOGS (lecture seule) ----
    if (path === 'auth/logs' && method === 'GET') {
        return send(res, 200, ok(paginate(accessLogs, page ?? '1')));
    }
    return false;
}
