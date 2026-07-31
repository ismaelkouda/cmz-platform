import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { AllProcessingFilterContract } from '../contracts/all-processing-filter.contract';

export function allProcessingFilterEntity(
    contract: AllProcessingFilterContract
): AllProcessingFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
