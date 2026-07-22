import { ResourcesQuery } from '@pages/seos-reference/application/queries/resources/resources.query';
import { ResourcesFilterContract } from '@pages/seos-reference/domain/contracts/resources/resources-filter.contract';

export function resourcesQueryMapper(
    query: ResourcesQuery
): ResourcesFilterContract {
    return {
        search: query.search,
        startDate: query.startDate,
        endDate: query.endDate,
    };
}
