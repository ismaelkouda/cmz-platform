import { TeamsEnableContract } from '../contracts/teams-enable.contract';
import { TeamsEnableValidateContract } from '../contracts/teams-enable.validate-contract';
import { validateTeamsEnable } from '../validators/teams-enable.validator';

export function teamsEnableVo(
    contract: TeamsEnableContract
): TeamsEnableValidateContract {
    validateTeamsEnable(contract);
    return contract;
}
