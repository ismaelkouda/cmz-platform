import { AgentsPerformancesFilterContract } from '@cmz/team-organization-domain';
import { AgentsPerformancesFilterApiDto } from '../dtos/agents-performances-filter-api.dto';

export function agentsPerformancesFilterMapper(
    contract: AgentsPerformancesFilterContract
): AgentsPerformancesFilterApiDto {
    const params: AgentsPerformancesFilterApiDto = {};

    if (contract.search) {
        params.search = contract.search;
    }
    if (contract.member) {
        params.member = contract.member;
    }
    if (contract.isAchieved) {
        params.is_achieved = contract.isAchieved;
    }
    if (contract.startDate) {
        params.start_date = contract.startDate;
    }
    if (contract.endDate) {
        params.end_date = contract.endDate;
    }

    return params;
}
