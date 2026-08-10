import { ReportStatesDetailsTakeContract } from '../contracts/report-states-details-take.contract';

export function reportStatesDetailsTakeVo(
    contract: ReportStatesDetailsTakeContract
): ReportStatesDetailsTakeContract {
    const uniqId = contract.uniqId?.trim();
    if (!uniqId) {
        throw new Error('REPORT_STATES.DETAILS.TAKE.UNIQ_ID_REQUIRED');
    }
    return { uniqId };
}
