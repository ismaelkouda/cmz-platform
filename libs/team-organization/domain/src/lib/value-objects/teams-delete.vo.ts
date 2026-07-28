import { TeamsDeleteContract } from '../contracts/teams-delete.contract';
import { TeamsDeleteValidateContract } from '../contracts/teams-delete.validate-contract';
import { validateTeamsDelete } from '../validators/teams-delete.validator';

export function teamsDeleteVo(
    contract: TeamsDeleteContract
): TeamsDeleteValidateContract {
    validateTeamsDelete(contract);
    return contract;
}
