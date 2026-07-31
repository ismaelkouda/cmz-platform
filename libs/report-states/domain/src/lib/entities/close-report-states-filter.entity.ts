import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { CloseReportStatesFilterContract } from '../contracts/close-report-states-filter.contract';

export function closeReportStatesFilterEntity(
    contract: CloseReportStatesFilterContract
): CloseReportStatesFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
