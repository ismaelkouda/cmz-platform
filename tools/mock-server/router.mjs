import { fail, send } from './http.mjs';
import { normalizeReportPath, rel } from './path.mjs';

import { handle as handleAdminInfra } from './domains/administrative-infrastructure.mjs';
import { handle as handleCoverageAreas } from './domains/coverage-areas.mjs';
import { handle as handleTeamOrganization } from './domains/team-organization.mjs';
import { handle as handleAdminBoundary } from './domains/administrative-boundary.mjs';
import { handle as handleContentManagement } from './domains/content-management.mjs';
import { handle as handleSettingsSecurity } from './domains/settings-security.mjs';
import { handle as handleCommunication } from './domains/communication.mjs';
import { handle as handleDashboard } from './domains/dashboard.mjs';
import { handle as handleInteractiveMap } from './domains/interactive-map.mjs';
import { handle as handleDashboardVariables } from './domains/dashboard-variables.mjs';
import { handle as handleReportStates } from './domains/report-states.mjs';
import { handle as handleRequests } from './domains/requests.mjs';
import { handle as handleProcessing } from './domains/processing.mjs';
import { handle as handleFinalization } from './domains/finalization.mjs';
import { handle as handleAuthentication } from './domains/authentication.mjs';

const DOMAIN_HANDLERS = [
    handleAdminInfra,
    handleCoverageAreas,
    handleTeamOrganization,
    handleAdminBoundary,
    handleContentManagement,
    handleSettingsSecurity,
    handleCommunication,
    handleDashboard,
    handleInteractiveMap,
    handleDashboardVariables,
    handleReportStates,
    handleRequests,
    handleProcessing,
    handleFinalization,
    handleAuthentication,
];

/**
 * Routeur mock — normalise le pathname puis délègue aux handlers domaine
 * (premier qui renvoie truthy gagne). Ordre calqué sur l'ancien monolithe.
 */
export async function handle(req, res, url) {
    const method = req.method ?? 'GET';
    if (method === 'OPTIONS') return send(res, 204, {});

    const path = normalizeReportPath(rel(url.pathname));
    const page = url.searchParams.get('page');
    const ctx = { path, method, req, res, page, url };

    for (const domainHandle of DOMAIN_HANDLERS) {
        if (await domainHandle(ctx)) return;
    }

    return send(res, 404, fail(`Mock: route non gérée (${method} ${path}).`));
}
