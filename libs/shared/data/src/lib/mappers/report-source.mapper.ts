import { Service } from '@angular/core';
import { isReportSource, ReportSource } from '@cmz/shared-domain';
import { ReportSourceDto } from '../dtos/report-source.dto';
import { ApiError } from '../errors/api.error';

@Service()
export class ReportSourceMapper {
    mapFromDto(dto: ReportSourceDto): ReportSource {
        if (!isReportSource(dto)) {
            throw ApiError.invalidResponse(
                `ReportSource wire inconnue: ${String(dto)}`
            );
        }
        return dto;
    }

    mapToDto(value: ReportSource): ReportSourceDto {
        return value as ReportSourceDto;
    }

    parse(raw: string): ReportSource {
        if (!isReportSource(raw)) {
            throw ApiError.invalidResponse(
                `ReportSource wire inconnue: ${raw}`
            );
        }
        return raw;
    }
}
