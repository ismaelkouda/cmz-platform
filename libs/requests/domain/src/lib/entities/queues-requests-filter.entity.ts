import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { QueuesRequestsFilterContract } from '../contracts/queues-requests-filter.contract';

export function queuesRequestsFilterEntity(
    contract: QueuesRequestsFilterContract
): QueuesRequestsFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
