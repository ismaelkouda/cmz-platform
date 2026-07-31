import { Service } from '@angular/core';
import {
    DownloadReportStatesStatus,
    DownloadReportStatesStatusStyle,
} from '@cmz/report-states-domain';
import { DownloadReportStatesStatusApiDto } from '../dtos/download-report-states-response-api.dto';

@Service()
export class DownloadReportStatesStatusMapper {
    private readonly fromApi: Record<
        DownloadReportStatesStatusApiDto,
        DownloadReportStatesStatus
    > = {
        pending: DownloadReportStatesStatus.PENDING,
        processing: DownloadReportStatesStatus.PROCESSING,
        done: DownloadReportStatesStatus.DONE,
        failed: DownloadReportStatesStatus.FAILED,
    };

    mapFromDto(
        dto: DownloadReportStatesStatusApiDto
    ): DownloadReportStatesStatus {
        return this.fromApi[dto];
    }

    mapToDto(
        status: DownloadReportStatesStatus
    ): DownloadReportStatesStatusApiDto {
        const toApi: Record<
            DownloadReportStatesStatus,
            DownloadReportStatesStatusApiDto
        > = {
            [DownloadReportStatesStatus.PENDING]: 'pending',
            [DownloadReportStatesStatus.PROCESSING]: 'processing',
            [DownloadReportStatesStatus.DONE]: 'done',
            [DownloadReportStatesStatus.FAILED]: 'failed',
        };
        return toApi[status];
    }

    mapStatusToStyle(
        status: DownloadReportStatesStatus
    ): DownloadReportStatesStatusStyle {
        const toStyle: Record<
            DownloadReportStatesStatus,
            DownloadReportStatesStatusStyle
        > = {
            [DownloadReportStatesStatus.PENDING]:
                DownloadReportStatesStatusStyle.PENDING,
            [DownloadReportStatesStatus.PROCESSING]:
                DownloadReportStatesStatusStyle.PROCESSING,
            [DownloadReportStatesStatus.DONE]:
                DownloadReportStatesStatusStyle.DONE,
            [DownloadReportStatesStatus.FAILED]:
                DownloadReportStatesStatusStyle.FAILED,
        };
        return toStyle[status];
    }
}
