import { SiteGroupDisableValidateContract } from '@cmz/coverage-areas-domain';
import { SiteGroupDisableApiDto } from '../dtos/site-group-disable-api.dto';

export function siteGroupDisableMapper(
    validContract: SiteGroupDisableValidateContract
): SiteGroupDisableApiDto {
    const params = {} as SiteGroupDisableApiDto;
    if (validContract.uniqId) {
        params.uniq_id = validContract.uniqId;
    }
    return params;
}
