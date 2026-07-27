import { RadioRelayLinksUpdateValidateContract } from '@cmz/coverage-areas-domain';
import { RadioRelayLinksUpdateApiDto } from '../dtos/radio-relay-links-update-api.dto';

export function radioRelayLinksUpdateMapper(
    validContract: RadioRelayLinksUpdateValidateContract
): RadioRelayLinksUpdateApiDto {
    const params = {} as RadioRelayLinksUpdateApiDto;
    if (validContract.uniqId) {
        params.id = validContract.uniqId;
    }
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
