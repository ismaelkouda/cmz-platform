import { RequestsDetailsApproveEntity } from '@cmz/requests-domain';
import { RequestsDetailsApproveApiDto } from '../dtos/requests-details-approve-api.dto';

export function requestsDetailsApproveMapper(
    entity: RequestsDetailsApproveEntity
): RequestsDetailsApproveApiDto {
    return {
        uniq_id: entity.uniqId,
        comment: entity.comment,
        approval_type: entity.approvalType,
        callback_type: entity.callbackType,
        lat: String(entity.latitude),
        long: String(entity.longitude),
        location_name: entity.locationName,
        report_type: entity.reportType,
        operators: entity.operators,
        description: entity.description,
        decision: entity.decision,
        place_description: entity.placeDescription,
        reason: entity.reason,
        place_photo: entity.placePhoto,
    };
}
