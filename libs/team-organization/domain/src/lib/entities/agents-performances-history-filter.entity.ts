import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { AgentsPerformancesHistoryFilterContract } from '../contracts/agents-performances-history-filter.contract';

export function agentsPerformancesHistoryFilterEntity(
    contract: AgentsPerformancesHistoryFilterContract
): AgentsPerformancesHistoryFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
