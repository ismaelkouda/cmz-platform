import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { QueuesFinalizationFilterContract } from '../contracts/queues-finalization-filter.contract';

export function queuesFinalizationFilterEntity(
    contract: QueuesFinalizationFilterContract
): QueuesFinalizationFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
