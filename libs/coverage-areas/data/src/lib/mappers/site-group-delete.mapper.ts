import { SiteGroupDeleteValidateContract } from '@cmz/coverage-areas-domain';
import { SiteGroupDeleteApiDto } from '../dtos/site-group-delete-api.dto';

export function siteGroupDeleteMapper(
    validContract: SiteGroupDeleteValidateContract
): SiteGroupDeleteApiDto {
    const params = {} as SiteGroupDeleteApiDto;
    if (validContract.uniqId) {
        params.uniq_id = validContract.uniqId;
    }
    return params;
}
