import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { AllFinalizationFilterContract } from '../contracts/all-finalization-filter.contract';

export function allFinalizationFilterEntity(
    contract: AllFinalizationFilterContract
): AllFinalizationFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
