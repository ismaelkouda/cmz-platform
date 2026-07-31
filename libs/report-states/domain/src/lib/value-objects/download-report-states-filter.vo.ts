import { DownloadReportStatesFilterContract } from '../contracts/download-report-states-filter.contract';
import { validateDownloadReportStatesFilter } from '../validators/download-report-states-filter.validator';

export function downloadReportStatesFilterVo(
    contract: DownloadReportStatesFilterContract
): DownloadReportStatesFilterContract {
    const resolved: DownloadReportStatesFilterContract = {
        ...contract,
        search: contract.search?.trim() || undefined,
        uniqId: contract.uniqId?.trim() || undefined,
        source: contract.source?.trim() || undefined,
        initiatorPhoneNumber:
            contract.initiatorPhoneNumber?.trim() || undefined,
    };
    validateDownloadReportStatesFilter(resolved);
    return resolved;
}
