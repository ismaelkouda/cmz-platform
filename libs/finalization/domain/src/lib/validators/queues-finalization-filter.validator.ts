import { assertValidDateRange } from '@cmz/shared-domain';
import { QueuesFinalizationFilterContract } from '../contracts/queues-finalization-filter.contract';

export function validateQueuesFinalizationFilter(
    contract: QueuesFinalizationFilterContract
): void {
    assertValidDateRange(contract.startDate, contract.endDate);
}
