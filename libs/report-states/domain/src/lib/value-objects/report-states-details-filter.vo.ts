import { ReportStatesDetailsFilterContract } from '../contracts/report-states-details-filter.contract';

export function reportStatesDetailsFilterVo(
    contract: ReportStatesDetailsFilterContract
): ReportStatesDetailsFilterContract {
    const uniqId = contract.uniqId?.trim();
    if (!uniqId) {
        throw new Error('REPORT_STATES.DETAILS.FILTER.UNIQ_ID_REQUIRED');
    }
    return { uniqId };
}
