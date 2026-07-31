import { RequestsDetailsFilterContract } from '@cmz/requests-domain';
import { RequestsDetailsFilterApiDto } from '../dtos/requests-details-filter-api.dto';

export function requestsDetailsFilterMapper(
    validContract: RequestsDetailsFilterContract
): RequestsDetailsFilterApiDto {
    return { uniq_id: validContract.uniqId };
}
