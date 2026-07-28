import { TeamsDisableContract } from '../contracts/teams-disable.contract';
import { TeamsDisableValidateContract } from '../contracts/teams-disable.validate-contract';
import { validateTeamsDisable } from '../validators/teams-disable.validator';

export function teamsDisableVo(
    contract: TeamsDisableContract
): TeamsDisableValidateContract {
    validateTeamsDisable(contract);
    return contract;
}
