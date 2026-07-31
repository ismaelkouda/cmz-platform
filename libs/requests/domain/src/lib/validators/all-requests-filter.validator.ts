import { assertValidDateRange } from '@cmz/shared-domain';
import { AllRequestsFilterContract } from '../contracts/all-requests-filter.contract';

export function validateAllRequestsFilter(
    contract: AllRequestsFilterContract
): void {
    assertValidDateRange(contract.startDate, contract.endDate);
}
