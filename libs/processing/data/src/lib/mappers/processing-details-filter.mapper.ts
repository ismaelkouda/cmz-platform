import { ProcessingDetailsFilterContract } from '@cmz/processing-domain';
import { ProcessingDetailsFilterApiDto } from '../dtos/processing-details-filter-api.dto';

export function processingDetailsFilterMapper(
    validContract: ProcessingDetailsFilterContract
): ProcessingDetailsFilterApiDto {
    return { uniq_id: validContract.uniqId };
}
