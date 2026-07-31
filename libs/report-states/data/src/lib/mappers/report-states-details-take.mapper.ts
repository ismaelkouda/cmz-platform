import { ReportStatesDetailsTakeEntity } from '@cmz/report-states-domain';
import { ReportStatesDetailsTakeApiDto } from '../dtos/report-states-details-take-api.dto';

export function reportStatesDetailsTakeMapper(
    entity: ReportStatesDetailsTakeEntity
): ReportStatesDetailsTakeApiDto {
    return { uniq_id: entity.uniqId };
}
