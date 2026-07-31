import { normalizePhoneNumber } from '@cmz/shared-domain';
import { QueuesFinalizationFilterContract } from '../contracts/queues-finalization-filter.contract';
import { validateQueuesFinalizationFilter } from '../validators/queues-finalization-filter.validator';

export function queuesFinalizationFilterVo(
    contract: QueuesFinalizationFilterContract
): QueuesFinalizationFilterContract {
    const resolved: QueuesFinalizationFilterContract = {
        ...contract,
        initiatorPhoneNumber: normalizePhoneNumber(
            contract.initiatorPhoneNumber?.trim()
        ),
        uniqId: contract.uniqId?.trim() || undefined,
        source: contract.source?.trim() || undefined,
    };
    validateQueuesFinalizationFilter(resolved);
    return resolved;
}
