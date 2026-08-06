import { AgentsPerformancesHistoryFilterContract } from '../contracts/agents-performances-history-filter.contract';
import { validateAgentsPerformancesHistoryFilter } from '../validators/agents-performances-history-filter.validator';

export function agentsPerformancesHistoryFilterVo(
    contract: AgentsPerformancesHistoryFilterContract
): AgentsPerformancesHistoryFilterContract {
    const resolved: AgentsPerformancesHistoryFilterContract = {
        ...contract,
        uniqId: contract.uniqId?.trim() || undefined,
        search: contract.search?.trim() || undefined,
    };
    validateAgentsPerformancesHistoryFilter(resolved);
    return resolved;
}
