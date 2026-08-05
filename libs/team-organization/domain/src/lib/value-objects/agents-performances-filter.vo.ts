import { AgentsPerformancesFilterContract } from '../contracts/agents-performances-filter.contract';
import { validateAgentsPerformancesFilter } from '../validators/agents-performances-filter.validator';

export function agentsPerformancesFilterVo(
    contract: AgentsPerformancesFilterContract
): AgentsPerformancesFilterContract {
    const resolved: AgentsPerformancesFilterContract = {
        ...contract,
        search: contract.search?.trim() || undefined,
        member: contract.member?.trim() || undefined,
        isAchieved: contract.isAchieved?.trim() || undefined,
    };
    validateAgentsPerformancesFilter(resolved);
    return resolved;
}
