import { normalizePhoneNumber } from '@cmz/shared-domain';
import { QueuesRequestsFilterContract } from '../contracts/queues-requests-filter.contract';
import { validateQueuesRequestsFilter } from '../validators/queues-requests-filter.validator';

export function queuesRequestsFilterVo(
    contract: QueuesRequestsFilterContract
): QueuesRequestsFilterContract {
    const resolved: QueuesRequestsFilterContract = {
        ...contract,
        initiatorPhoneNumber: normalizePhoneNumber(
            contract.initiatorPhoneNumber?.trim()
        ),
        uniqId: contract.uniqId?.trim() || undefined,
        source: contract.source?.trim() || undefined,
    };
    validateQueuesRequestsFilter(resolved);
    return resolved;
}
