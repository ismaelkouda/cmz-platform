import { ResourcesFilterContract } from '@pages/seos-reference/domain/contracts/resources/resources-filter.contract';
import { ResourcesFilterApiDto } from '@pages/seos-reference/infrastructure/api/dto/resources/resources-filter-api.dto';

export function resourcesFilterMapper(
    validContract: ResourcesFilterContract
): ResourcesFilterApiDto {
    const params: ResourcesFilterApiDto = {};
    if (validContract.search) {
        params.search = validContract.search;
    }
    if (validContract.startDate) {
        params.start_date = validContract.startDate;
    }
    if (validContract.endDate) {
        params.end_date = validContract.endDate;
    }
    return params;
}
