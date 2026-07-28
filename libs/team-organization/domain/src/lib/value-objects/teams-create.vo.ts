import { TeamsCreateContract } from '../contracts/teams-create.contract';
import { TeamsCreateValidateContract } from '../contracts/teams-create.validate-contract';
import { validateTeamsCreate } from '../validators/teams-create.validator';

export function teamsCreateVo(
    contract: TeamsCreateContract
): TeamsCreateValidateContract {
    validateTeamsCreate(contract);
    return contract;
}
