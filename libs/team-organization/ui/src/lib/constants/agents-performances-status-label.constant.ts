import { AgentsPerformancesStatus } from '@cmz/team-organization-domain';

/** Clés i18n des libellés de statut agent — présentation pure, même convention que `PARTICIPANTS_STATUS_LABEL`. */
export const AGENTS_PERFORMANCES_STATUS_LABEL: Record<
    AgentsPerformancesStatus,
    string
> = {
    [AgentsPerformancesStatus.COMPLETED]: 'COMMON.COMPLETED',
    [AgentsPerformancesStatus.NOT_COMPLETED]: 'COMMON.NOT_COMPLETED',
};
