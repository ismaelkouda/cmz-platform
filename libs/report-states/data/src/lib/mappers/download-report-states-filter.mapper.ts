import { DownloadReportStatesFilterContract } from '@cmz/report-states-domain';
import { DownloadReportStatesFilterApiDto } from '../dtos/download-report-states-filter-api.dto';
import { DownloadReportStatesStatusMapper } from './download-report-states-status.mapper';

export function downloadReportStatesFilterMapper(
    validContract: DownloadReportStatesFilterContract
): DownloadReportStatesFilterApiDto {
    const statusMapper = new DownloadReportStatesStatusMapper();
    const params = {} as DownloadReportStatesFilterApiDto;

    if (validContract.search) {
        params.search = validContract.search;
    }
    if (validContract.date) {
        params.date = validContract.date.toISOString();
    }
    if (validContract.initiatorPhoneNumber) {
        params.initiator_phone_number = validContract.initiatorPhoneNumber;
    }
    if (validContract.uniqId) {
        params.uniq_id = validContract.uniqId;
    }
    if (validContract.reportType) {
        params.report_type = validContract.reportType;
    }
    if (validContract.operators?.length) {
        params.operators = validContract.operators;
    }
    if (validContract.source) {
        params.source = validContract.source;
    }
    if (validContract.status) {
        params.status = statusMapper.mapToDto(validContract.status);
    }
    if (validContract.startDate) {
        params.start_date = validContract.startDate.toISOString();
    }
    if (validContract.endDate) {
        params.end_date = validContract.endDate.toISOString();
    }

    return params;
}
