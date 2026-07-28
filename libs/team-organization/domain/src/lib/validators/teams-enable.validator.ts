import { GenericRequiredError } from '@cmz/shared-domain';
import { TeamsEnableContract } from '../contracts/teams-enable.contract';
import { TeamsEnableValidateContract } from '../contracts/teams-enable.validate-contract';

export function validateTeamsEnable(
    contract: TeamsEnableContract
): asserts contract is TeamsEnableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.TEAMS.FORM.ERROR.ENABLE.UNIQ_ID_REQUIRE'
        );
    }
}
