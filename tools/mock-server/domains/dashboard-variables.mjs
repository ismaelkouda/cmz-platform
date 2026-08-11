import { ok, send } from '../http.mjs';

// ---- VARIABLES : liens Grafana partagés (T2-4, ex-`monitoring.mjs`) ------
// `GET {SETTINGS_API_URL}/variables` est **une seule ressource backend**
// consommée indépendamment par 3 modules Nx différents (chacun avec sa
// propre classe `*Api`/`*Repository`, mais appelant la même URL — cf.
// docstring de `MonitoringApi` : "même verbe, même URL, même base... une
// seule classe suffit ; c'est la section qui choisit quel champ de la
// réponse est pertinent, pas l'URL appelée"). Un seul mock ici, fidèle à
// cette topologie réelle — pas un fichier par module Nx consommateur (une
// tentative de fichier `reporting.mjs` séparé pour ce même chemin
// `variables` serait soit du code mort — le premier handler du routeur qui
// répond gagne, cf. `router.mjs` — soit une désynchronisation si les deux
// répondent des sous-ensembles différents des champs).
//
// Champ → module(s) consommateur(s), pour que "domaine mock reporting
// manquant" (T2-4, docs/architecture/taches-restantes.md) ne se reproduise
// pas : la couverture existe déjà, elle était juste sous un nom qui ne la
// rendait pas cherchable.
//   - `useOfServersResourcesLink` : monitoring (sections NODE + SERVICES)
//   - `useOfResourcesLink`        : monitoring (section RESOURCES)
//   - `impactJobs`                : monitoring (section JOBS)
//   - `reportReportingLink`       : reporting (section REPORT)
//   - `requestReportReportingLink`: reporting (section REQUESTS)
//   - `reportByChannel`           : reporting (section REPORT_BY_CHANNEL)
//   - `reportByOperator`          : reporting (section REPORT_BY_OPERATOR)
//   - `mapLink`                   : interactive-map (`MapApi.getMap`)
export function dashboardVariables() {
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
    // ---- VARIABLES (monitoring + reporting + interactive-map) ----
    if (path === 'variables' && method === 'GET') {
        return send(res, 200, ok(dashboardVariables()));
    }
    return false;
}
