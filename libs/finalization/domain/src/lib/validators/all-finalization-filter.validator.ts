import { assertValidDateRange } from '@cmz/shared-domain';
import { AllFinalizationFilterContract } from '../contracts/all-finalization-filter.contract';

export function validateAllFinalizationFilter(
    contract: AllFinalizationFilterContract
): void {
    assertValidDateRange(contract.startDate, contract.endDate);
}
