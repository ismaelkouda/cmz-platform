import { ReportType } from '@cmz/shared-domain';
import { DownloadReportStatesStatus } from '../enums/download-report-states-status.enum';

export interface DownloadReportStatesFilterContract {
    search?: string;
    date?: Date;
    initiatorPhoneNumber?: string;
    uniqId?: string;
    reportType?: ReportType;
    operators?: string[];
    source?: string;
    status?: DownloadReportStatesStatus;
    startDate?: Date;
    endDate?: Date;
}
