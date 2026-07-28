import { TeamsUpdateContract } from '../contracts/teams-update.contract';
import { TeamsUpdateValidateContract } from '../contracts/teams-update.validate-contract';
import { validateTeamsUpdate } from '../validators/teams-update.validator';

export function teamsUpdateVo(
    contract: TeamsUpdateContract
): TeamsUpdateValidateContract {
    validateTeamsUpdate(contract);
    return contract;
}
