import { Service } from '@angular/core';
import { TypeReport } from '@cmz/shared-domain';
import { TypeReportApiDto } from '../dtos/notifications-type-report-api.dto';

@Service()
export class NotificationsTypeReportMapper {
    private readonly dtoToDomain: Record<TypeReportApiDto, TypeReport> = {
        RequestReport: TypeReport.REQUESTS,
        ProcessingReport: TypeReport.PROCESSING,
        FinalizationReport: TypeReport.FINALIZATION,
    };

    mapFromDto(dto: TypeReportApiDto): TypeReport {
        return this.dtoToDomain[dto];
    }
}
