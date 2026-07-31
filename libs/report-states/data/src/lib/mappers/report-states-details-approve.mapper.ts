import { ReportStatesDetailsApproveEntity } from '@cmz/report-states-domain';
import { ReportStatesDetailsApproveApiDto } from '../dtos/report-states-details-approve-api.dto';

export function reportStatesDetailsApproveMapper(
    entity: ReportStatesDetailsApproveEntity
): ReportStatesDetailsApproveApiDto {
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
