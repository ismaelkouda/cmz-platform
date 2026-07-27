import { SiteGroupUpdateValidateContract } from '@cmz/coverage-areas-domain';
import { SiteGroupUpdateApiDto } from '../dtos/site-group-update-api.dto';

export function siteGroupUpdateMapper(
    validContract: SiteGroupUpdateValidateContract
): SiteGroupUpdateApiDto {
    const params = {} as SiteGroupUpdateApiDto;
    if (validContract.uniqId) {
        params.id = validContract.uniqId;
    }
    if (validContract.code) {
        params.code = validContract.code;
    }
    if (validContract.name) {
        params.name = validContract.name;
    }
    if (validContract.description) {
        params.description = validContract.description;
    }
    return params;
}
