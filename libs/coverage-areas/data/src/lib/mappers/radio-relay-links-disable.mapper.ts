import { RadioRelayLinksDisableValidateContract } from '@cmz/coverage-areas-domain';
import { RadioRelayLinksDisableApiDto } from '../dtos/radio-relay-links-disable-api.dto';

export function radioRelayLinksDisableMapper(
    validContract: RadioRelayLinksDisableValidateContract
): RadioRelayLinksDisableApiDto {
    const params = {} as RadioRelayLinksDisableApiDto;
    if (validContract.uniqId) {
        params.uniq_id = validContract.uniqId;
    }
    return params;
}
