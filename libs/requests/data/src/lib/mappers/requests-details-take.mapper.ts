import { RequestsDetailsTakeEntity } from '@cmz/requests-domain';
import { RequestsDetailsTakeApiDto } from '../dtos/requests-details-take-api.dto';

export function requestsDetailsTakeMapper(
    entity: RequestsDetailsTakeEntity
): RequestsDetailsTakeApiDto {
    return { uniq_id: entity.uniqId };
}
