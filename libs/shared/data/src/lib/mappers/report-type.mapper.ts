import { Service } from '@angular/core';
import { ReportType } from '@cmz/shared-domain';
import { ReportTypeDto } from '../dtos/report-type.dto';

@Service()
export class ReportTypeMapper {
    mapToEnum(dtoValue: ReportTypeDto): ReportType {
        const methodMap: Record<ReportTypeDto, ReportType> = {
            [ReportTypeDto.ABI]: ReportType.ABI,
            [ReportTypeDto.ZOB]: ReportType.ZOB,
            [ReportTypeDto.CPS]: ReportType.CPS,
            [ReportTypeDto.CPO]: ReportType.CPO,
        };
        return methodMap[dtoValue];
    }

    mapToDto(enumValue: ReportType): ReportTypeDto {
        const mapping: Record<ReportType, ReportTypeDto> = {
            [ReportType.ABI]: ReportTypeDto.ABI,
            [ReportType.ZOB]: ReportTypeDto.ZOB,
            [ReportType.CPS]: ReportTypeDto.CPS,
            [ReportType.CPO]: ReportTypeDto.CPO,
        };
        return mapping[enumValue];
    }
}
