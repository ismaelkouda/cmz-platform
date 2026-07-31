import { RequestsDetailsRejectEntity } from '@cmz/requests-domain';
import { RequestsDetailsRejectApiDto } from '../dtos/requests-details-reject-api.dto';

export function requestsDetailsRejectMapper(
    entity: RequestsDetailsRejectEntity
): RequestsDetailsRejectApiDto {
    return {
        uniq_id: entity.uniqId,
        comment: entity.comment,
        reason: entity.reason,
        callback_type: entity.callbackType,
    };
}
