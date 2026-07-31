import { Service } from '@angular/core';
import { DownloadReportStatesType } from '@cmz/report-states-domain';
import { DownloadReportStatesTypeApiDto } from '../dtos/download-report-states-response-api.dto';

@Service()
export class DownloadReportStatesTypeMapper {
    mapFromDto(dto: DownloadReportStatesTypeApiDto): DownloadReportStatesType {
        const map: Record<
            DownloadReportStatesTypeApiDto,
            DownloadReportStatesType
        > = {
            excel: DownloadReportStatesType.EXCEL,
            shapefile: DownloadReportStatesType.SHAPE,
        };
        return map[dto];
    }
}
