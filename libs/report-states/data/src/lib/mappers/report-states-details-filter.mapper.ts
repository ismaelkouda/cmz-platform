import { ReportStatesDetailsFilterContract } from '@cmz/report-states-domain';
import { ReportStatesDetailsFilterApiDto } from '../dtos/report-states-details-filter-api.dto';

export function reportStatesDetailsFilterMapper(
    validContract: ReportStatesDetailsFilterContract
): ReportStatesDetailsFilterApiDto {
    return { uniq_id: validContract.uniqId };
}
