import { assertValidDateRange } from '@cmz/shared-domain';
import { AllProcessingFilterContract } from '../contracts/all-processing-filter.contract';

export function validateAllProcessingFilter(
    contract: AllProcessingFilterContract
): void {
    assertValidDateRange(contract.startDate, contract.endDate);
}
