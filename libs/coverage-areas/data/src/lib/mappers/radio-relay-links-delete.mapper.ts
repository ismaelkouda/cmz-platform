import { RadioRelayLinksDeleteValidateContract } from '@cmz/coverage-areas-domain';
import { RadioRelayLinksDeleteApiDto } from '../dtos/radio-relay-links-delete-api.dto';

export function radioRelayLinksDeleteMapper(
    validContract: RadioRelayLinksDeleteValidateContract
): RadioRelayLinksDeleteApiDto {
    const params = {} as RadioRelayLinksDeleteApiDto;
    if (validContract.uniqId) {
        params.uniq_id = validContract.uniqId;
    }
    return params;
}
