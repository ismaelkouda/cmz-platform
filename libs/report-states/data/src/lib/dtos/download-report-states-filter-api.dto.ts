import { DownloadReportStatesStatusApiDto } from './download-report-states-response-api.dto';

export interface DownloadReportStatesFilterApiDto {
    search?: string;
    date?: string;
    initiator_phone_number?: string;
    uniq_id?: string;
    report_type?: string;
    operators?: string[];
    source?: string;
    status?: DownloadReportStatesStatusApiDto;
    start_date?: string;
    end_date?: string;
}
