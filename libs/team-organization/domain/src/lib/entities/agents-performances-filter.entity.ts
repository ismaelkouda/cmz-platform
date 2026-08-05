import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { AgentsPerformancesFilterContract } from '../contracts/agents-performances-filter.contract';

/**
 * `AgentsPerformancesFilterContract` a `startDate`/`endDate` (period côté
 * legacy) — même schéma que `queues-processing-filter.entity.ts`
 * (référence workflow-action).
 */
export function agentsPerformancesFilterEntity(
    contract: AgentsPerformancesFilterContract
): AgentsPerformancesFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
