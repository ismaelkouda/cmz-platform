import { ResourcesFilterContract } from '@pages/seos-reference/domain/contracts/resources/resources-filter.contract';
import { validateResourcesFilter } from '@pages/seos-reference/domain/validators/resources/resources-filter.validator';

export function resourcesFilterVo(
    contract: ResourcesFilterContract
): ResourcesFilterContract {
    validateResourcesFilter(contract);
    return contract;
}
