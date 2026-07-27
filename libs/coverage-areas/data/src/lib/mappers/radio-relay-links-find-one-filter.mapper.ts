import { RadioRelayLinksFindOneFilterValidateContract } from '@cmz/coverage-areas-domain';
import { RadioRelayLinksFindOneFilterApiDto } from '../dtos/radio-relay-links-find-one-filter-api.dto';

export function radioRelayLinksFindOneFilterMapper(
    validContract: RadioRelayLinksFindOneFilterValidateContract
): RadioRelayLinksFindOneFilterApiDto {
    const params = {} as RadioRelayLinksFindOneFilterApiDto;
    if (validContract.uniqId) {
        params.id = validContract.uniqId;
    }
    return params;
}
