import { assertValidDateRange } from '@cmz/shared-domain';
import { DownloadReportStatesFilterContract } from '../contracts/download-report-states-filter.contract';

export function validateDownloadReportStatesFilter(
    contract: DownloadReportStatesFilterContract
): void {
    assertValidDateRange(contract.startDate, contract.endDate);
}
