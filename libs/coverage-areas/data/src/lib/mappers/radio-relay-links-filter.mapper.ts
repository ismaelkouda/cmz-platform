import { RadioRelayLinksFilterContract } from '@cmz/coverage-areas-domain';
import { RadioRelayLinksFilterApiDto } from '../dtos/radio-relay-links-filter-api.dto';

export function radioRelayLinksFilterMapper(
    validContract: RadioRelayLinksFilterContract
): RadioRelayLinksFilterApiDto {
    const params = {} as RadioRelayLinksFilterApiDto;
    if (validContract.search) {
        params.search = validContract.search;
    }
    if (validContract.operator) {
        params.operator = validContract.operator;
    }
    if (validContract.startDate) {
        params.start_date = validContract.startDate.toISOString();
    }
    if (validContract.endDate) {
        params.end_date = validContract.endDate.toISOString();
    }
    return params;
}
