import { assertValidDateRange } from '@cmz/shared-domain';
import { InfrastructureTypeFilterContract } from '../contracts/infrastructure-type-filter.contract';

export function validateInfrastructureTypeFilter(
    contract: InfrastructureTypeFilterContract
): void {
    assertValidDateRange(contract?.startDate, contract?.endDate);
}
