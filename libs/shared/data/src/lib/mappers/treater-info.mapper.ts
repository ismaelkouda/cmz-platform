import { Service } from '@angular/core';
import { TreaterInfoEntity } from '@cmz/shared-domain';
import { TreaterInfoDto } from '../dtos/treater-info.dto';

@Service()
export class TreaterInfoMapper {
    mapToEntity(dto: TreaterInfoDto): TreaterInfoEntity {
        return new TreaterInfoEntity(
            dto.acknowledged_at,
            dto.created_at,
            dto.reported_at,
            dto.processed_at,
            dto.approved_at,
            dto.finalized_at,
            dto.rejected_at,
            dto.confirmed_at,
            dto.abandoned_at,
            dto.processed_comment,
            dto.approved_comment,
            dto.rejected_comment,
            dto.acknowledged_comment,
            dto.confirmed_comment,
            dto.abandoned_comment,
            dto.deny_count,
            dto.reason,
            dto.callback_type
        );
    }

    mapToDto(entity: TreaterInfoEntity): TreaterInfoDto {
        return {
            acknowledged_at: entity.acknowledgedAt,
            created_at: entity.createdAt,
            reported_at: entity.reportedAt,
            processed_at: entity.processedAt,
            approved_at: entity.approvedAt,
            finalized_at: entity.finalizedAt,
            rejected_at: entity.rejectedAt,
            confirmed_at: entity.confirmedAt,
            abandoned_at: entity.abandonedAt,
            processed_comment: entity.processedComment,
            approved_comment: entity.approvedComment,
            rejected_comment: entity.rejectedComment,
            acknowledged_comment: entity.acknowledgedComment,
            confirmed_comment: entity.confirmedComment,
            abandoned_comment: entity.abandonedComment,
            deny_count: entity.denyCount,
            reason: entity.reason,
            callback_type: entity.callbackType,
        };
    }
}
