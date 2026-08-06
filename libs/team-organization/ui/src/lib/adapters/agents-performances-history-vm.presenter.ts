import { AgentsPerformancesHistoryEntity } from '@cmz/team-organization-domain';
import { AgentsPerformancesHistoryVmProps } from './agents-performances-history-vm-props.interface';

export class AgentsPerformancesHistoryPresenter {
    map(
        item: AgentsPerformancesHistoryEntity
    ): AgentsPerformancesHistoryVmProps {
        return {
            uniqId: item.uniqId,
            reportType: item.reportType,
            operators: item.operators,
            source: item.source,
            initiatorPhoneNumber: item.initiatorPhoneNumber,
            createdAt: item.createdAt,
            actionsRef: item.uniqId,
        };
    }
}
