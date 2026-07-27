import { RadioRelayLinksEnableValidateContract } from '@cmz/coverage-areas-domain';
import { RadioRelayLinksEnableApiDto } from '../dtos/radio-relay-links-enable-api.dto';

export function radioRelayLinksEnableMapper(
    validContract: RadioRelayLinksEnableValidateContract
): RadioRelayLinksEnableApiDto {
    const params = {} as RadioRelayLinksEnableApiDto;
    if (validContract.uniqId) {
        params.uniq_id = validContract.uniqId;
    }
    return params;
}
