import { AgentsPerformancesHistoryFilterContract } from '@cmz/team-organization-domain';
import { AgentsPerformancesHistoryFilterApiDto } from '../dtos/agents-performances-history-filter-api.dto';

export function agentsPerformancesHistoryFilterMapper(
    contract: AgentsPerformancesHistoryFilterContract
): AgentsPerformancesHistoryFilterApiDto {
    return {
        uniq_id: contract.uniqId ?? '',
        search: contract.search,
        report_type: contract.reportType,
        operators: contract.operators ?? [],
        start_date: contract.startDate,
        end_date: contract.endDate,
    };
}
