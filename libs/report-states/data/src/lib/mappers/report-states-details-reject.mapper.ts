import { ReportStatesDetailsRejectEntity } from '@cmz/report-states-domain';
import { ReportStatesDetailsRejectApiDto } from '../dtos/report-states-details-reject-api.dto';

export function reportStatesDetailsRejectMapper(
    entity: ReportStatesDetailsRejectEntity
): ReportStatesDetailsRejectApiDto {
    return {
        uniq_id: entity.uniqId,
        comment: entity.comment,
        reason: entity.reason,
        callback_type: entity.callbackType,
    };
}
