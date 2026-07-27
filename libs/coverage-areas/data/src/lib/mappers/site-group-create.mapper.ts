import { SiteGroupCreateValidateContract } from '@cmz/coverage-areas-domain';
import { SiteGroupCreateApiDto } from '../dtos/site-group-create-api.dto';

export function siteGroupCreateMapper(
    validContract: SiteGroupCreateValidateContract
): SiteGroupCreateApiDto {
    const params = {} as SiteGroupCreateApiDto;
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
