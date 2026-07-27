import { SiteGroupEnableValidateContract } from '@cmz/coverage-areas-domain';
import { SiteGroupEnableApiDto } from '../dtos/site-group-enable-api.dto';

export function siteGroupEnableMapper(
    validContract: SiteGroupEnableValidateContract
): SiteGroupEnableApiDto {
    const params = {} as SiteGroupEnableApiDto;
    if (validContract.uniqId) {
        params.uniq_id = validContract.uniqId;
    }
    return params;
}
