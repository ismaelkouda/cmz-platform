import { PaginatedMapper } from '@cmz/shared-data';
import { ReportStateItemEntity } from '@cmz/report-states-domain';
import { ReportStateItemApiDto } from '../dtos/report-state-item.dto';

export class ReportStateItemMapper extends PaginatedMapper<
    ReportStateItemEntity,
    ReportStateItemApiDto
> {
    protected override mapItemFromDto(
        dto: ReportStateItemApiDto
    ): ReportStateItemEntity {
        return new ReportStateItemEntity(
            dto.id ?? '',
            dto.uniq_id ?? dto.id ?? '',
            dto.report_type ?? '',
            dto.operator ?? '',
            dto.source ?? '',
            dto.created_at ?? '',
            dto.status ?? ''
        );
    }
}
