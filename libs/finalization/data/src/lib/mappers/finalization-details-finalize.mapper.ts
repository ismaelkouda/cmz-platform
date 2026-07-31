import { FinalizationDetailsFinalizeEntity } from '@cmz/finalization-domain';
import { FinalizationDetailsFinalizeApiDto } from '../dtos/finalization-details-finalize-api.dto';

export function finalizationDetailsFinalizeMapper(
    entity: FinalizationDetailsFinalizeEntity
): FinalizationDetailsFinalizeApiDto {
    return {
        uniq_id: entity.uniqId,
        comment: entity.comment,
    };
}
