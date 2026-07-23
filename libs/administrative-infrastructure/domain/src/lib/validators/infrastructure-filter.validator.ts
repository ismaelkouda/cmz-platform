import { assertValidDateRange } from '@cmz/shared-domain';
import { InfrastructureFilterContract } from '../contracts/infrastructure-filter.contract';

export function validateInfrastructureFilter(
    contract: InfrastructureFilterContract
): void {
    assertValidDateRange(contract?.startDate, contract?.endDate);
}
