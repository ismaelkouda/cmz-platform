import { assertValidDateRange } from '@cmz/shared-domain';
import { QueuesProcessingFilterContract } from '../contracts/queues-processing-filter.contract';

export function validateQueuesProcessingFilter(
    contract: QueuesProcessingFilterContract
): void {
    assertValidDateRange(contract.startDate, contract.endDate);
}
