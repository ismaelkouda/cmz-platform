import { ResourcesFilterContract } from '@pages/seos-reference/domain/contracts/resources/resources-filter.contract';
import { resolveOpenEndedEndDate } from '@shared/domain/utils/resolve-open-ended-end-date.util';

export function resourcesFilterEntity(
    contract: ResourcesFilterContract
): ResourcesFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
