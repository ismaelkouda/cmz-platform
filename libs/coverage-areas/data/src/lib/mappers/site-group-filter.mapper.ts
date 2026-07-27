import { SiteGroupFilterContract, Status } from '@cmz/coverage-areas-domain';
import { SiteGroupFilterApiDto } from '../dtos/site-group-filter-api.dto';

export function siteGroupFilterMapper(
    validContract: SiteGroupFilterContract
): SiteGroupFilterApiDto {
    const params = {} as SiteGroupFilterApiDto;
    if (validContract.search) {
        params.search = validContract.search;
    }
    if (validContract.status !== undefined) {
        params.is_active = validContract.status === Status.ACTIVE;
    }
    return params;
}
