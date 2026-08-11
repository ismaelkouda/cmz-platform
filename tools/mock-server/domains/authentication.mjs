import { fail, ok, readBody, send } from '../http.mjs';
import { nextId } from '../ids.mjs';
import { MOCK_CREDENTIALS, MOCK_RESET_TOKEN } from '../credentials.mjs';

export { MOCK_CREDENTIALS, MOCK_RESET_TOKEN };

export const mockUser = {
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
    // pathsGuard (T5-3) ne porte que les 4 segments workflow-action :
    //   report-states | processing | requests | finalization
    // `processing` autorisé pour le cas positif e2e ; les 3 autres refusés.
    // dashboard / crud hors pathsGuard → accessibles post-auth uniquement.
    // Format chemin absolu avec slash depuis T3-2 (2026-08-11) — confirmé
    // contre une vraie réponse de connexion staging, voir paths.guard.ts.
    paths: [
        '/dashboard',
        '/processing',
        '/equipments/types',
        '/territorial-structures/regions',
    ],
    actions: { INFRASTRUCTURE: ['create', 'edit', 'delete'] },
};

export const mockToken = () => ({
    value: `mock-token-${nextId()}`,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
});

/**
 * @param {{ path: string, method: string, req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, page: string | null, url: URL }} ctx
 * @returns {Promise<boolean|void>|boolean|void} truthy si la route a été servie
 */
export async function handle(ctx) {
    const { path, method, req, res, page, url } = ctx;
    let m;
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
    return false;
}
