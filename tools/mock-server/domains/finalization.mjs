import { ok, readBody, send } from '../http.mjs';
import { now } from '../ids.mjs';
import { paginate, paginateAll } from '../paginate.mjs';
import {
    REQUESTS_LIST_POOL_SIZE,
    filterRequestsListItems,
} from '../report-list.mjs';
import { buildProcessingDetail } from './processing.mjs';

/**
 * @param {{ path: string, method: string, req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, page: string | null, url: URL }} ctx
 */
export async function handle(ctx) {
    const { path, method, req, res, page, url } = ctx;
    // ---- FINALIZATION — listes paginées (GET) + export métier (GET /export) ----
    const FIN_LIST_PATHS = new Set([
        'finalizations/queues',
        'finalizations/task-baskets',
        'finalizations',
    ]);
    const FIN_EXPORT_PATHS = new Set([
        'finalizations/queues/export',
        'finalizations/task-baskets/export',
        'finalizations/export',
    ]);

    function buildFinalizationListItems(count = REQUESTS_LIST_POOL_SIZE) {
        return Array.from({ length: count }, (_, i) => ({
            uniq_id: `FIN-${String(i + 1).padStart(4, '0')}`,
            report_type: i % 2 === 0 ? 'abi' : 'zob',
            operators:
                i % 3 === 0
                    ? ['mtn', 'orange']
                    : i % 2 === 0
                      ? ['mtn']
                      : ['moov'],
            source: i % 2 === 0 ? 'sms' : 'app',
            initiator_phone_number: `690000${String(i).padStart(4, '0')}`,
            reported_at: now(),
            updated_at: now(),
        }));
    }

    if (FIN_LIST_PATHS.has(path) && method === 'GET') {
        const filtered = filterRequestsListItems(
            buildFinalizationListItems(),
            url.searchParams
        );
        return send(res, 200, ok(paginate(filtered, page ?? '1')));
    }

    if (FIN_EXPORT_PATHS.has(path) && method === 'GET') {
        const filtered = filterRequestsListItems(
            buildFinalizationListItems(),
            url.searchParams
        );
        return send(res, 200, ok(paginateAll(filtered)));
    }

    const buildFinalizationDetail = (uniqId) => {
        if (!global.finalizationDetailStore) {
            global.finalizationDetailStore = new Map();
        }
        const store = global.finalizationDetailStore;
        const stored = store.get(uniqId) ?? {
            finalization_state: 'pending',
            status: 'finalization',
        };
        return {
            ...buildProcessingDetail(uniqId),
            uniq_id: uniqId,
            status: 'finalization',
            finalization_state: stored.finalization_state,
            state:
                stored.finalization_state === 'completed'
                    ? 'completed'
                    : stored.finalization_state === 'in-progress'
                      ? 'in-progress'
                      : 'pending',
        };
    };

    const finDetailGetMatch = path.match(/^FIN-\d+$/);
    if (finDetailGetMatch && method === 'GET') {
        return send(res, 200, ok(buildFinalizationDetail(path)));
    }

    const finTakeMatch = path.match(/^finalizations\/([^/]+)\/take$/);
    if (finTakeMatch && method === 'POST') {
        const [, uniqId] = finTakeMatch;
        if (!global.finalizationDetailStore) {
            global.finalizationDetailStore = new Map();
        }
        global.finalizationDetailStore.set(uniqId, {
            finalization_state: 'in-progress',
            status: 'finalization',
        });
        return send(res, 200, ok({ message: 'Prise en charge effectuée.' }));
    }

    const finFinalizeMatch = path.match(/^([^/]+)\/finalize$/);
    if (
        finFinalizeMatch &&
        method === 'POST' &&
        !path.startsWith('requests/') &&
        !path.startsWith('report/')
    ) {
        const [, uniqId] = finFinalizeMatch;
        if (!global.finalizationDetailStore) {
            global.finalizationDetailStore = new Map();
        }
        global.finalizationDetailStore.set(uniqId, {
            finalization_state: 'completed',
            status: 'finalization',
        });
        return send(res, 200, ok({ message: 'Finalisation effectuée.' }));
    }
    return false;
}
