import { ProcessingDetailsTakeEntity } from '@cmz/processing-domain';
import { ProcessingDetailsTakeApiDto } from '../dtos/processing-details-take-api.dto';

export function processingDetailsTakeMapper(
    entity: ProcessingDetailsTakeEntity
): ProcessingDetailsTakeApiDto {
    return { uniq_id: entity.uniqId };
}
