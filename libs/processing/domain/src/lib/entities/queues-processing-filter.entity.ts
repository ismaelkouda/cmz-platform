import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { QueuesProcessingFilterContract } from '../contracts/queues-processing-filter.contract';

export function queuesProcessingFilterEntity(
    contract: QueuesProcessingFilterContract
): QueuesProcessingFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
