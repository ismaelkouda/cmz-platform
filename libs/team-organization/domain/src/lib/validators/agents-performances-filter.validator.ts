import { assertValidDateRange } from '@cmz/shared-domain';
import { AgentsPerformancesFilterContract } from '../contracts/agents-performances-filter.contract';

export function validateAgentsPerformancesFilter(
    contract: AgentsPerformancesFilterContract
): void {
    assertValidDateRange(contract.startDate, contract.endDate);
}
