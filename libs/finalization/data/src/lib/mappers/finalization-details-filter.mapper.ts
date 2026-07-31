import { FinalizationDetailsFilterContract } from '@cmz/finalization-domain';
import { FinalizationDetailsFilterApiDto } from '../dtos/finalization-details-filter-api.dto';

export function finalizationDetailsFilterMapper(
    validContract: FinalizationDetailsFilterContract
): FinalizationDetailsFilterApiDto {
    return { uniq_id: validContract.uniqId };
}
