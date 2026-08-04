import { ok, send } from '../http.mjs';

// ---- MONITORING : liens Grafana (objet unique, lecture seule) ----------
// Une seule ressource `variables` sert les 4 sous-pages `monitoring`
// (`node`/`services` lisent `useOfServersResourcesLink`, `resources` lit
// `useOfResourcesLink`, `jobs` lit `impactJobs`) — cf. doc module. Le champ
// wire est déjà en camelCase dans le contrat source (pas de snake_case ici,
// à la différence du reste du fichier).
export function monitoringVariables() {
    return {
        useOfServersResourcesLink:
            'https://grafana.cmz.internal/d/servers-resources/utilisation-des-serveurs?orgId=1&kiosk',
        useOfResourcesLink:
            'https://grafana.cmz.internal/d/resources/utilisation-des-ressources?orgId=1&kiosk',
        impactJobs:
            'https://grafana.cmz.internal/d/jobs-impact/impact-des-jobs?orgId=1&kiosk',
        reportReportingLink:
            'https://grafana.cmz.internal/d/reports/suivi-des-signalements?orgId=1&kiosk',
        requestReportReportingLink:
            'https://grafana.cmz.internal/d/requests/suivi-des-demandes?orgId=1&kiosk',
        reportByChannel:
            'https://grafana.cmz.internal/d/report-by-channel/signalements-par-canal?orgId=1&kiosk',
        reportByOperator:
            'https://grafana.cmz.internal/d/report-by-operator/signalements-par-operateurs?orgId=1&kiosk',
        mapLink:
            'https://grafana.cmz.internal/d/interactive-map/carte-interactive?orgId=1&kiosk',
    };
}


/**
 * @param {{ path: string, method: string, req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, page: string | null, url: URL }} ctx
 * @returns {Promise<boolean|void>|boolean|void} truthy si la route a été servie
 */
export async function handle(ctx) {
    const { path, method, req, res, page, url } = ctx;
    let m;
    // ---- MONITORING ----
    if (path === 'variables' && method === 'GET') {
        return send(res, 200, ok(monitoringVariables()));
    }
    return false;
}
