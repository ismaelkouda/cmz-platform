import { SiteGroupFindOneFilterValidateContract } from '@cmz/coverage-areas-domain';
import { SiteGroupFindOneFilterApiDto } from '../dtos/site-group-find-one-filter-api.dto';

export function siteGroupFindOneFilterMapper(
    validContract: SiteGroupFindOneFilterValidateContract
): SiteGroupFindOneFilterApiDto {
    const params = {} as SiteGroupFindOneFilterApiDto;
    if (validContract.uniqId) {
        params.id = validContract.uniqId;
    }
    return params;
}
