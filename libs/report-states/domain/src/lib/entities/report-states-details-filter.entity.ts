import { ReportStatesDetailsFilterContract } from '../contracts/report-states-details-filter.contract';

export function reportStatesDetailsFilterEntity(
    contract: ReportStatesDetailsFilterContract
): ReportStatesDetailsFilterContract {
    return { uniqId: contract.uniqId };
}
