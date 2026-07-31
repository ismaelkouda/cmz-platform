import { normalizePhoneNumber } from '@cmz/shared-domain';
import { QueuesProcessingFilterContract } from '../contracts/queues-processing-filter.contract';
import { validateQueuesProcessingFilter } from '../validators/queues-processing-filter.validator';

export function queuesProcessingFilterVo(
    contract: QueuesProcessingFilterContract
): QueuesProcessingFilterContract {
    const resolved: QueuesProcessingFilterContract = {
        ...contract,
        initiatorPhoneNumber: normalizePhoneNumber(
            contract.initiatorPhoneNumber?.trim()
        ),
        uniqId: contract.uniqId?.trim() || undefined,
        source: contract.source?.trim() || undefined,
    };
    validateQueuesProcessingFilter(resolved);
    return resolved;
}
