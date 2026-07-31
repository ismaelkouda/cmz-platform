import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { DownloadReportStatesFilterContract } from '../contracts/download-report-states-filter.contract';

export function downloadReportStatesFilterEntity(
    contract: DownloadReportStatesFilterContract
): DownloadReportStatesFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
