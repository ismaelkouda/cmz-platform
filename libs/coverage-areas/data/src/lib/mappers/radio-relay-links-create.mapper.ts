import { RadioRelayLinksCreateValidateContract } from '@cmz/coverage-areas-domain';
import { RadioRelayLinksCreateApiDto } from '../dtos/radio-relay-links-create-api.dto';

export function radioRelayLinksCreateMapper(
    validContract: RadioRelayLinksCreateValidateContract
): RadioRelayLinksCreateApiDto {
    const params = {} as RadioRelayLinksCreateApiDto;
    if (validContract.name) {
        params.name = validContract.name;
    }
    if (validContract.operator) {
        params.operator = validContract.operator;
    }
    if (validContract.frequency) {
        params.frequency = validContract.frequency;
    }
    if (validContract.startDate) {
        params.start_date = validContract.startDate.toISOString();
    }
    if (validContract.endDate) {
        params.end_date = validContract.endDate.toISOString();
    }
    return params;
}
