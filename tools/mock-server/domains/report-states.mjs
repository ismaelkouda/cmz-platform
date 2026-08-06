import { fail, ok, readBody, send } from '../http.mjs';
import { now } from '../ids.mjs';
import { paginate, paginateAll } from '../paginate.mjs';

/**
 * @param {{ path: string, method: string, req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, page: string | null, url: URL }} ctx
 * @returns {Promise<boolean|void>|boolean|void} truthy si la route a été servie
 */
export async function handle(ctx) {
    const { path, method, req, res, page, url } = ctx;
    let m;
    // ---- REPORT-STATES — listes paginées (GET) ----
    // URLs calées sur les endpoints réels du backend.
    // Les anciennes URLs (requests/approved, finalizations/evaluated…) sont
    // conservées en alias pour la rétrocompatibilité.
    const RS_SECTION_STATUS = {
        // Nouvelles URLs canoniques (contrat API réel)
        'report-states/approve': 'pending',
        'report-states/evaluate': 'under_evaluation',
        'report-states/close': 'closed',
        'report-states/reject': 'rejected',
        'report-states/download': 'exported',
        // Anciennes URLs — conservées en alias
        'requests/approved': 'approved',
        'finalizations/evaluated': 'evaluated',
        finalizations: 'closed',
        'requests/rejected': 'rejected',
        exports: 'exported',
    };
    const RS_EXPORT_PATHS = new Set([
        'requests/approved/export',
        'finalizations/evaluated/export',
        'finalizations/export',
        'requests/rejected/export',
    ]);

    if (RS_EXPORT_PATHS.has(path) && method === 'GET') {
        const statusKey = path.replace('/export', '');
        const status = RS_SECTION_STATUS[statusKey] ?? 'approved';
        const items = Array.from({ length: 15 }, (_, i) => ({
            id: `rs-export-${i + 1}`,
            uniq_id: `RS-EXP-${String(i + 1).padStart(3, '0')}`,
            report_type: i % 2 === 0 ? 'abi' : 'zob',
            operators: ['mtn'],
            source: 'sms',
            initiator_phone_number: `690000${String(i).padStart(4, '0')}`,
            reported_at: now(),
            updated_at: now(),
            status,
        }));
        return send(res, 200, ok({ data: items }));
    }

    if (RS_SECTION_STATUS[path] !== undefined && method === 'GET') {
        const status = RS_SECTION_STATUS[path];
        const items = Array.from({ length: 15 }, (_, i) => ({
            id: `rs-${status}-${i + 1}`,
            uniq_id: `RS-${status.toUpperCase().replace(/_/g, '')}-${String(i + 1).padStart(3, '0')}`,
            report_type:
                i % 3 === 0
                    ? "Absence d'Internet"
                    : i % 3 === 1
                      ? 'Mauvais Signal'
                      : 'Coupure Réseau',
            operator: i % 2 === 0 ? 'MTN' : 'Moov',
            region: i % 3 === 0 ? 'Centre' : i % 3 === 1 ? 'Littoral' : 'Ouest',
            department: i % 2 === 0 ? 'Mfoundi' : 'Wouri',
            municipality: i % 2 === 0 ? 'Yaoundé I' : 'Douala I',
            source: i % 2 === 0 ? 'SMS [9001]' : 'Web App',
            created_at: now(),
            updated_at: now(),
            status,
            taken_by: status !== 'pending' ? 'Agent Dupont' : null,
        }));
        return send(res, 200, ok(paginate(items, page ?? '1')));
    }

    // Détail d'un rapport (route : report-states/:section/:id)
    const rsDetailMatch = path.match(/^report-states\/([^/]+)\/([^/]+)$/);
    if (rsDetailMatch && method === 'GET') {
        const [, section, id] = rsDetailMatch;
        const status =
            RS_SECTION_STATUS[`report-states/${section}`] ?? 'pending';
        return send(
            res,
            200,
            ok({
                id,
                uniq_id: `RS-DETAIL-001`,
                report_type: "Absence d'Internet",
                operator: 'MTN',
                region: 'Centre',
                department: 'Mfoundi',
                municipality: 'Yaoundé I',
                source: 'SMS [9001]',
                description:
                    'Perte de signal complète depuis 48h. Plusieurs foyers affectés.',
                status,
                taken_by: status !== 'pending' ? 'Agent Dupont' : null,
                created_at: now(),
                updated_at: now(),
                history: [
                    {
                        action: 'created',
                        actor: 'Citoyen',
                        date: now(),
                        note: null,
                    },
                    {
                        action: 'received',
                        actor: 'Système',
                        date: now(),
                        note: null,
                    },
                ],
            })
        );
    }

    // Actions de workflow report-states (POST : approve / reject / evaluate / close / take)
    const RS_ACTION_STATUS = {
        approve: 'approved',
        reject: 'rejected',
        evaluate: 'under_evaluation',
        close: 'closed',
        take: 'taken',
    };
    const rsActionMatch = path.match(
        /^report-states\/([^/]+)\/(approve|reject|evaluate|close|take)$/
    );
    if (rsActionMatch && method === 'POST') {
        const [, id, action] = rsActionMatch;
        const b = await readBody(req);
        return send(
            res,
            200,
            ok({
                id,
                status: RS_ACTION_STATUS[action],
                reason: b.reason ?? null,
                updated_at: now(),
                message: `Rapport ${id} — action '${action}' appliquée avec succès.`,
            })
        );
    }
    return false;
}
