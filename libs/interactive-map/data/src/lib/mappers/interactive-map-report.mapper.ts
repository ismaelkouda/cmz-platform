import { InteractiveMapReportEntity } from '@cmz/interactive-map-domain';
import { InteractiveMapReportApiDto } from '../dtos/interactive-map-report-api.dto';

export class InteractiveMapReportMapper {
    mapFromDto(dto: InteractiveMapReportApiDto): InteractiveMapReportEntity {
        return {
            uniqId: String(dto.uniq_id),
            reportType: dto.report_type,
            operator: Array.isArray(dto.operators)
                ? dto.operators.join(', ')
                : String(dto.operators ?? ''),
            state: dto.state,
            latitude: Number(dto.lat),
            longitude: Number(dto.long),
            regionName: this.placeName(dto.region),
            departmentName: this.placeName(dto.department),
            municipalityName: this.placeName(dto.municipality),
            reportedAt: dto.reported_at ?? undefined,
        };
    }

    private placeName(
        value: { name?: string } | string | null | undefined
    ): string | undefined {
        if (value == null) {
            return undefined;
        }
        if (typeof value === 'string') {
            return value;
        }
        return value.name ?? undefined;
    }
}
