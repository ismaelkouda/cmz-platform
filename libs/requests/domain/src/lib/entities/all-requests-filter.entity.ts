import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { AllRequestsFilterContract } from '../contracts/all-requests-filter.contract';

export function allRequestsFilterEntity(
    contract: AllRequestsFilterContract
): AllRequestsFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
