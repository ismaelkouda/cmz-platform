import { FinalizationDetailsTakeEntity } from '@cmz/finalization-domain';
import { FinalizationDetailsTakeApiDto } from '../dtos/finalization-details-take-api.dto';

export function finalizationDetailsTakeMapper(
    entity: FinalizationDetailsTakeEntity
): FinalizationDetailsTakeApiDto {
    return { uniq_id: entity.uniqId };
}
