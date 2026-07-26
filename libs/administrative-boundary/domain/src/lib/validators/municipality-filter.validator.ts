import { assertValidDateRange } from '@cmz/shared-domain';
import { MunicipalityFilterContract } from '../contracts/municipality-filter.contract';

export function validateMunicipalityFilter(
    contract: MunicipalityFilterContract
): void {
    assertValidDateRange(contract?.startDate, contract?.endDate);
}
