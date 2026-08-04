import { ok, send } from '../http.mjs';
import { now } from '../ids.mjs';


// ---- INTERACTIVE-MAP : signalements géolocalisés (SIG v1) ----------------
export function interactiveMapReports() {
    const points = [
        { lat: 6.13, long: 1.22, report_type: 'abi', operators: 'orange' },
        { lat: 6.25, long: 1.15, report_type: 'zob', operators: 'moov' },
        { lat: 6.08, long: 1.31, report_type: 'cps', operators: 'mtn' },
        { lat: 6.18, long: 1.05, report_type: 'cpo', operators: 'orange' },
        { lat: 6.35, long: 1.28, report_type: 'abi', operators: 'mtn' },
    ];
    return {
        data: points.map((p, i) => ({
            uniq_id: `MAP-${String(i + 1).padStart(3, '0')}`,
            lat: p.lat,
            long: p.long,
            report_type: p.report_type,
            operators: p.operators,
            state: i % 2 === 0 ? 'processing' : 'finalization',
            is_duplicated: false,
            region: { name: 'Maritime' },
            department: { name: 'Golfe' },
            municipality: { name: 'Lomé' },
            reported_at: now(),
        })),
    };
}


/**
 * @param {{ path: string, method: string, req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, page: string | null, url: URL }} ctx
 * @returns {Promise<boolean|void>|boolean|void} truthy si la route a été servie
 */
export async function handle(ctx) {
    const { path, method, req, res, page, url } = ctx;
    let m;
    // ---- INTERACTIVE-MAP ----
    if (path === 'report/all' && method === 'GET') {
        return send(res, 200, ok(interactiveMapReports()));
    }
    return false;
}
