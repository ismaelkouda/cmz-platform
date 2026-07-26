import { Service } from '@angular/core';
import { isReportType, ReportType } from '@cmz/shared-domain';
import { ReportTypeDto } from '../dtos/report-type.dto';
import { ApiError } from '../errors/api.error';

@Service()
export class ReportTypeMapper {
    mapFromDto(dto: ReportTypeDto): ReportType {
        if (!isReportType(dto)) {
            throw ApiError.invalidResponse(
                `ReportType wire inconnue: ${String(dto)}`
            );
        }
        return dto;
    }

    mapToDto(value: ReportType): ReportTypeDto {
        return value as ReportTypeDto;
    }

    parse(raw: string): ReportType {
        if (!isReportType(raw)) {
            throw ApiError.invalidResponse(`ReportType wire inconnue: ${raw}`);
        }
        return raw;
    }
}
