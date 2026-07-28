import { TeamsFindOneFilterContract } from '../contracts/teams-find-one-filter.contract';
import { TeamsFindOneFilterValidateContract } from '../contracts/teams-find-one-filter.validate-contract';
import { validateTeamsFindOneFilter } from '../validators/teams-find-one-filter.validator';

export function teamsFindOneFilterVo(
    contract: TeamsFindOneFilterContract
): TeamsFindOneFilterValidateContract {
    validateTeamsFindOneFilter(contract);
    return contract;
}
