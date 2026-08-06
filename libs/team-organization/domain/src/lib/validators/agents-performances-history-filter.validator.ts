import { assertValidDateRange } from '@cmz/shared-domain';
import { AgentsPerformancesHistoryFilterContract } from '../contracts/agents-performances-history-filter.contract';

export function validateAgentsPerformancesHistoryFilter(
    contract: AgentsPerformancesHistoryFilterContract
): void {
    assertValidDateRange(contract.startDate, contract.endDate);
}
