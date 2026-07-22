import { ResourcesFilterContract } from '@pages/seos-reference/domain/contracts/resources/resources-filter.contract';
import { assertValidDateRange } from '@shared/domain/validators/assert-valid-date-range.validator';

export function validateResourcesFilter(
    contract: ResourcesFilterContract
): asserts contract is ResourcesFilterContract {
    assertValidDateRange(contract?.startDate, contract?.endDate);
}
