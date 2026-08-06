import { fail, ok, readBody, send } from '../http.mjs';
import { now } from '../ids.mjs';
import { paginate, paginateAll } from '../paginate.mjs';
import {
    buildRequestsListItems,
    filterRequestsListItems,
} from '../report-list.mjs';
import { buildProcessingDetail } from './processing.mjs';

/**
 * @param {{ path: string, method: string, req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, page: string | null, url: URL }} ctx
 */
export async function handle(ctx) {
    const { path, method, req, res, page, url } = ctx;
    // ---- REQUESTS — listes paginées (GET) + export métier (GET /export) ----
    const REQ_LIST_PATHS = new Set([
        'requests/queues',
        'requests/task-baskets',
        'requests/qualified',
    ]);
    const REQ_EXPORT_PATHS = new Set([
        'requests/queues/export',
        'requests/task-baskets/export',
        'requests/qualified/export',
    ]);

    if (REQ_LIST_PATHS.has(path) && method === 'GET') {
        const filtered = filterRequestsListItems(
            buildRequestsListItems(),
            url.searchParams
        );
        return send(res, 200, ok(paginate(filtered, page ?? '1')));
    }

    if (REQ_EXPORT_PATHS.has(path) && method === 'GET') {
        const filtered = filterRequestsListItems(
            buildRequestsListItems(),
            url.searchParams
        );
        return send(res, 200, ok(paginateAll(filtered)));
    }

    const buildRequestsDetail = (uniqId) => {
        if (!global.requestsDetailStore) {
            global.requestsDetailStore = new Map();
        }
        const store = global.requestsDetailStore;
        const stored = store.get(uniqId) ?? {
            status: 'pending',
            qualification_state: 'pending',
            processing_state: 'pending',
        };
        const seq =
            Number.parseInt(String(uniqId).replace(/\D+/g, ''), 10) || 1;
        const idx = seq - 1;
        return {
            ...buildProcessingDetail(uniqId),
            uniq_id: uniqId,
            report_type: idx % 2 === 0 ? 'abi' : 'zob',
            operators:
                idx % 3 === 0
                    ? ['mtn', 'orange']
                    : idx % 2 === 0
                      ? ['mtn']
                      : ['moov'],
            source: idx % 2 === 0 ? 'sms' : 'app',
            initiator_phone_number: `690000${String(idx).padStart(4, '0')}`,
            status: stored.status,
            qualification_state: stored.qualification_state,
            processing_state: stored.processing_state,
            state:
                stored.status === 'approved'
                    ? 'approved'
                    : stored.status === 'rejected'
                      ? 'rejected'
                      : stored.status === 'in-progress'
                        ? 'in-progress'
                        : 'pending',
        };
    };

    const requestsDetailMatch = path.match(/^requests\/([^/]+)$/);
    if (requestsDetailMatch && method === 'GET') {
        const [, uniqId] = requestsDetailMatch;
        if (!['queues', 'task-baskets', 'qualified'].includes(uniqId)) {
            return send(res, 200, ok(buildRequestsDetail(uniqId)));
        }
    }

    const requestsTakeMatch = path.match(/^requests\/([^/]+)\/take$/);
    if (requestsTakeMatch && method === 'POST') {
        const [, uniqId] = requestsTakeMatch;
        if (!global.requestsDetailStore) {
            global.requestsDetailStore = new Map();
        }
        global.requestsDetailStore.set(uniqId, {
            status: 'in-progress',
            qualification_state: 'pending',
            processing_state: 'in-progress',
        });
        return send(res, 200, ok({ message: 'Prise en charge effectuée.' }));
    }

    const requestsApproveMatch = path.match(/^requests\/([^/]+)\/approve$/);
    if (requestsApproveMatch && method === 'POST') {
        const [, uniqId] = requestsApproveMatch;
        if (!global.requestsDetailStore) {
            global.requestsDetailStore = new Map();
        }
        global.requestsDetailStore.set(uniqId, {
            status: 'approved',
            qualification_state: 'completed',
            processing_state: 'in-progress',
        });
        return send(res, 200, ok({ message: 'Qualification effectuée.' }));
    }

    const requestsRejectMatch = path.match(/^requests\/([^/]+)\/reject$/);
    if (requestsRejectMatch && method === 'POST') {
        const [, uniqId] = requestsRejectMatch;
        if (!global.requestsDetailStore) {
            global.requestsDetailStore = new Map();
        }
        global.requestsDetailStore.set(uniqId, {
            status: 'rejected',
            qualification_state: 'completed',
            processing_state: 'in-progress',
        });
        return send(res, 200, ok({ message: 'Rejet effectué.' }));
    }
    return false;
}
