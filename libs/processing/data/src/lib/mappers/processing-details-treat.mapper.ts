import { ProcessingDetailsTreatEntity } from '@cmz/processing-domain';
import { ProcessingDetailsTreatApiDto } from '../dtos/processing-details-treat-api.dto';

export function processingDetailsTreatMapper(
    entity: ProcessingDetailsTreatEntity
): ProcessingDetailsTreatApiDto {
    const dto: ProcessingDetailsTreatApiDto = { uniq_id: entity.uniqId };
    if (entity.comment) {
        dto.comment = entity.comment;
    }
    return dto;
}
