import { TeamsFilterContract } from '../contracts/teams-filter.contract';
import { validateTeamsFilter } from '../validators/teams-filter.validator';

export function teamsFilterVo(
    contract: TeamsFilterContract
): TeamsFilterContract {
    validateTeamsFilter(contract);
    return contract;
}
