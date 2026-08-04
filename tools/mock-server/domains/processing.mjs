import { fail, ok, readBody, send } from '../http.mjs';
import { nextId, now } from '../ids.mjs';
import { paginate, paginateAll } from '../paginate.mjs';

export const buildProcessingDetail = (uniqId) => ({
    id: uniqId,
    uniq_id: uniqId,
    request_report_uniq_id: uniqId,
    source: 'sms',
    location_method: 'auto',
    location_type: 'gps',
    lat: '3.848',
    long: '11.502',
    what3words: 'index.home.raft',
    place_description: 'Quartier central',
    location_name: 'Yaoundé',
    report_type: 'no_internet',
    operators: ['mtn'],
    place_photo: '',
    access_place_photo: '',
    description: 'Coupure totale constatée dans le secteur.',
    initiator_phone_number: '690000001',
    processed_at: '',
    approved_at: null,
    finalized_at: null,
    rejected_at: null,
    confirmed_at: null,
    abandoned_at: null,
    acknowledged_at: null,
    reason: null,
    callback_type: null,
    status: 'pending',
    qualification_state: null,
    processing_state: 'in-progress',
    finalization_state: null,
    state: 'in-progress',
    deny_count: 0,
    confirm_count: 0,
    acknowledged_comment: null,
    processed_comment: null,
    finalized_comment: null,
    approved_comment: null,
    rejected_comment: null,
    confirmed_comment: null,
    abandoned_comment: null,
    duplicate_of: null,
    is_duplicated: false,
    position: '',
    created_at: now(),
    reported_at: now(),
    updated_at: now(),
    region_id: 1,
    department_id: 1,
    municipality_code: 1,
    initiator: null,
    acknowledged_by: null,
    approved_by: null,
    rejected_by: null,
    processed_by: null,
    finalized_by: null,
    confirmed_by: null,
    abandoned_by: null,
    region: { id: '1', name: 'Centre', code: 'CE' },
    department: { id: '1', name: 'Mfoundi', code: 'MF' },
    municipality: { id: '1', name: 'Yaoundé I', code: 'Y1' },
});

/**
 * @param {{ path: string, method: string, req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, page: string | null, url: URL }} ctx
 */
export async function handle(ctx) {
    const { path, method, req, res, page, url } = ctx;
    // ---- PROCESSING — listes paginées (GET) + export métier (GET /export) ----
    const PROC_LIST_PATHS = new Set(['queues', 'taken', 'processing']);
    const PROC_EXPORT_PATHS = new Set([
        'queues/export',
        'taken/export',
        'processing/export',
    ]);

    const buildProcessingListItems = () =>
        Array.from({ length: 12 }, (_, i) => ({
            uniq_id: `PROC-${String(i + 1).padStart(3, '0')}`,
            report_type: i % 2 === 0 ? 'abi' : 'zob',
            operators: i % 2 === 0 ? ['mtn'] : ['moov'],
            source: i % 2 === 0 ? 'sms' : 'app',
            initiator_phone_number: `6900000${String(i).padStart(2, '0')}`,
            reported_at: now(),
            updated_at: now(),
        }));

    if (PROC_LIST_PATHS.has(path) && method === 'GET') {
        return send(
            res,
            200,
            ok(paginate(buildProcessingListItems(), page ?? '1'))
        );
    }

    if (PROC_EXPORT_PATHS.has(path) && method === 'GET') {
        return send(res, 200, ok(paginateAll(buildProcessingListItems())));
    }

    // Alias rétrocompatibilité mock ancien
    const PROC_SECTIONS = {
        queues: 'queued',
        taken: 'in_progress',
        processing: 'all',
        'report/queues': 'queued',
        'report/taken': 'in_progress',
        'report/processing': 'all',
        // Alias rétrocompatibilité mock ancien
        'processing/all': 'all',
        'processing/queues': 'queued',
        'processing/tasks': 'in_progress',
    };
    if (PROC_SECTIONS[path] !== undefined && method === 'GET') {
        const items = buildProcessingListItems();
        return send(res, 200, ok(paginate(items, page ?? '1')));
    }

    // Détail signalement — legacy GET {reportUrl}{uniq_id}
    const reportDetailMatch = path.match(/^report\/([^/]+)$/);
    if (reportDetailMatch && method === 'GET') {
        const [, uniqId] = reportDetailMatch;
        if (!PROC_SECTIONS[uniqId] && uniqId !== 'statistics') {
            return send(res, 200, ok(buildProcessingDetail(uniqId)));
        }
    }

    const reportTakeMatch = path.match(/^report\/([^/]+)\/take$/);
    if (reportTakeMatch && method === 'POST') {
        return send(res, 200, ok({ message: 'Prise en charge effectuée.' }));
    }

    const reportProcessMatch = path.match(/^report\/([^/]+)\/process$/);
    if (reportProcessMatch && method === 'POST') {
        return send(res, 200, ok({ message: 'Traitement effectué.' }));
    }

    const actor = () => ({
        id: 'user-1',
        first_name: 'Agent',
        last_name: 'CMZ',
        phone: '690000000',
        email: 'agent@cmz.local',
    });

    const processingActionTypes = [
        {
            code: 'ANALYSIS',
            name: 'Analyse',
            operators: ['mtn', 'orange', 'moov'],
        },
        {
            code: 'TREATMENT',
            name: 'Traitement',
            operators: ['mtn', 'orange', 'moov'],
        },
        {
            code: 'VERIFICATION',
            name: 'Vérification',
            operators: ['mtn', 'orange'],
        },
    ];

    if (!global.processingActionsStore) {
        global.processingActionsStore = new Map();
    }
    const actionsStore = global.processingActionsStore;

    const buildActionRow = (reportId, idx) => ({
        id: `act-${reportId}-${idx}`,
        date: now(),
        type: 'Analyse',
        type_code: 'ANALYSIS',
        operator: 'mtn',
        description: 'Action mock de traitement',
        should_notify_user: false,
        auto_check: false,
        result: 'conform',
        created_by: actor(),
        updated_by: actor(),
        created_at: now(),
        updated_at: now(),
    });

    const procActionTypesMatch = path.match(
        /^report\/processing-actions\/([^/]+)\/report-types$/
    );
    if (procActionTypesMatch && method === 'GET') {
        return send(res, 200, ok(processingActionTypes));
    }

    const procActionsListMatch = path.match(
        /^report\/([^/]+)\/processing-actions$/
    );
    if (procActionsListMatch && method === 'GET') {
        const [, reportId] = procActionsListMatch;
        if (!actionsStore.has(reportId)) {
            actionsStore.set(reportId, [
                buildActionRow(reportId, 1),
                buildActionRow(reportId, 2),
            ]);
        }
        const items = actionsStore.get(reportId) ?? [];
        return send(res, 200, ok(paginate(items, page ?? '1')));
    }

    if (path === 'report/processing-actions/store' && method === 'POST') {
        const b = await readBody(req);
        const reportId = b.report_uniq_id ?? b.reportUniqId ?? 'PROC-001';
        const list = actionsStore.get(reportId) ?? [];
        const row = {
            ...buildActionRow(reportId, list.length + 1),
            type_code: b.type_code ?? 'ANALYSIS',
            type: b.type_code ?? 'Analyse',
            operator: b.operator ?? 'mtn',
            description: b.description ?? '',
            should_notify_user: Boolean(b.should_notify_user),
            result: b.result ?? 'conform',
        };
        list.push(row);
        actionsStore.set(reportId, list);
        return send(res, 200, ok({ message: 'Action créée.' }));
    }

    const procActionUpdateMatch = path.match(
        /^report\/processing-actions\/([^/]+)\/update$/
    );
    if (procActionUpdateMatch && method === 'POST') {
        const [, actionId] = procActionUpdateMatch;
        const b = await readBody(req);
        for (const [reportId, list] of actionsStore.entries()) {
            const idx = list.findIndex((row) => row.id === actionId);
            if (idx >= 0) {
                list[idx] = {
                    ...list[idx],
                    type_code: b.type_code ?? list[idx].type_code,
                    type: b.type_code ?? list[idx].type,
                    operator: b.operator ?? list[idx].operator,
                    description: b.description ?? list[idx].description,
                    should_notify_user: Boolean(
                        b.should_notify_user ?? list[idx].should_notify_user
                    ),
                    result: b.result ?? list[idx].result,
                    updated_at: now(),
                };
                actionsStore.set(reportId, list);
                break;
            }
        }
        return send(res, 200, ok({ message: 'Action mise à jour.' }));
    }

    const procActionDeleteMatch = path.match(
        /^report\/processing-actions\/([^/]+)\/delete$/
    );
    if (procActionDeleteMatch && method === 'DELETE') {
        const [, actionId] = procActionDeleteMatch;
        for (const [reportId, list] of actionsStore.entries()) {
            const next = list.filter((row) => row.id !== actionId);
            if (next.length !== list.length) {
                actionsStore.set(reportId, next);
                break;
            }
        }
        return send(res, 200, ok({ message: 'Action supprimée.' }));
    }

    // Détail processing (alias mock historique)
    const procDetailMatch = path.match(/^processing\/detail\/([^/]+)$/);
    if (procDetailMatch && method === 'GET') {
        const [, id] = procDetailMatch;
        return send(
            res,
            200,
            ok({
                id,
                uniq_id: 'PROC-DETAIL-001',
                report_type: "Absence d'Internet",
                operator: 'MTN',
                region: 'Centre',
                department: 'Mfoundi',
                municipality: 'Yaoundé I',
                status: 'in_progress',
                priority: 'high',
                assigned_to: 'Agent Martin',
                description:
                    'Coupure totale constatée dans le secteur depuis 72h.',
                history: [
                    {
                        action: 'created',
                        actor: 'Citoyen',
                        date: now(),
                        note: null,
                    },
                    {
                        action: 'queued',
                        actor: 'Système',
                        date: now(),
                        note: null,
                    },
                    {
                        action: 'taken',
                        actor: 'Agent Martin',
                        date: now(),
                        note: 'Prise en charge',
                    },
                ],
                created_at: now(),
                updated_at: now(),
            })
        );
    }

    // Actions processing (take / release / escalate)
    const procActionMatch = path.match(
        /^processing\/([^/]+)\/(take|release|escalate)$/
    );
    if (procActionMatch && method === 'POST') {
        const [, id, action] = procActionMatch;
        const statusMap = {
            take: 'in_progress',
            release: 'queued',
            escalate: 'escalated',
        };
        return send(
            res,
            200,
            ok({
                id,
                status: statusMap[action],
                updated_at: now(),
                message: `Traitement ${id} — action '${action}' appliquée.`,
            })
        );
    }
    return false;
}
