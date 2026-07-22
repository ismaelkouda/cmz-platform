import { Service } from '@angular/core';
import { ReportSource } from '@cmz/shared-domain';
import { ReportSourceDto } from '../dto/report-source.dto';

@Service()
export class ReportSourceMapper {
    private static readonly MAP = new Map<ReportSourceDto, ReportSource>([
        [ReportSourceDto.APP, ReportSource.APP],
        [ReportSourceDto.USSD, ReportSource.USSD],
        [ReportSourceDto.SMS, ReportSource.SMS],
        [ReportSourceDto.IVR, ReportSource.IVR],
    ]);

    mapToEnum(dtoValue: ReportSourceDto): ReportSource {
        if (dtoValue === null || dtoValue === undefined) {
            return ReportSource.APP;
        }
        return ReportSourceMapper.MAP.get(dtoValue) ?? ReportSource.APP;
    }
}
