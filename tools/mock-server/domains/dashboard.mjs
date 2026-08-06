import { ok, send } from '../http.mjs';
import { now } from '../ids.mjs';

// ---- DASHBOARD : statistiques agrégées (lecture seule) -------------------
// Objet unique, pas de liste — `period` (query param) ignoré, même
// précédent que tout le reste du fichier (aucune route ne filtre
// réellement sur ses query params, cf. `users`/`access-logs`/`messaging`).
// Champs déjà au format wire (`DashboardItemApiDto`), pas de mapper dédié.
export function dashboardStats() {
    return {
        total_reports: 4820,
        total_cpo_reports: 640,
        total_zob_reports: 210,
        total_cps_reports: 380,
        total_abi_reports: 95,
        total_request_report_pending: 312,
        total_request_report_rejected: 148,
        total_reports_in_processing: 96,
        total_reports_finalized: 4160,
        total_reports_evaluated: 3890,
        treatmentRate: 86,
        completionRate: 93,
        averageTreatmentTime: 4,
        responseTime: 12,
        last_refresh_at: now(),
    };
}

/**
 * @param {{ path: string, method: string, req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, page: string | null, url: URL }} ctx
 * @returns {Promise<boolean|void>|boolean|void} truthy si la route a été servie
 */
export async function handle(ctx) {
    const { path, method, req, res, page, url } = ctx;
    let m;
    // ---- DASHBOARD ----
    if (path === 'report/statistics' && method === 'GET') {
        return send(res, 200, ok(dashboardStats()));
    }
    return false;
}
