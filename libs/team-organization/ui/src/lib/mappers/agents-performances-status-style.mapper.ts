import { AgentsPerformancesStatus } from '@cmz/team-organization-domain';
import { AgentsPerformancesStatusStyle } from '../enums/agents-performances-status-style.enum';

const MAP: Record<AgentsPerformancesStatus, AgentsPerformancesStatusStyle> = {
    [AgentsPerformancesStatus.COMPLETED]: AgentsPerformancesStatusStyle.COMPLETED,
    [AgentsPerformancesStatus.NOT_COMPLETED]:
        AgentsPerformancesStatusStyle.NOT_COMPLETED,
};

/** Traduit un `AgentsPerformancesStatus` (domaine) en style d'affichage — logique UI. */
export function agentsPerformancesStatusStyleOf(
    status: AgentsPerformancesStatus
): AgentsPerformancesStatusStyle {
    return MAP[status];
}
