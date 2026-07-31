import { assertValidDateRange } from '@cmz/shared-domain';
import { QueuesRequestsFilterContract } from '../contracts/queues-requests-filter.contract';

export function validateQueuesRequestsFilter(
    contract: QueuesRequestsFilterContract
): void {
    assertValidDateRange(contract.startDate, contract.endDate);
}
