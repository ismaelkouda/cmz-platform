import { ResourcesFindOneQuery } from '@pages/seos-reference/application/queries/resources/resources-find-one.query';
import { ResourcesFindOneFilterContract } from '@pages/seos-reference/domain/contracts/resources/resources-find-one-filter.contract';

export function resourcesFindOneQueryMapper(
    query: ResourcesFindOneQuery
): ResourcesFindOneFilterContract {
    return { uniqId: query.uniqId };
}
