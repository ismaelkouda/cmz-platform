import { GenericRequiredError } from '@cmz/shared-domain';
import { TeamsDisableContract } from '../contracts/teams-disable.contract';
import { TeamsDisableValidateContract } from '../contracts/teams-disable.validate-contract';

export function validateTeamsDisable(
    contract: TeamsDisableContract
): asserts contract is TeamsDisableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.TEAMS.FORM.ERROR.DISABLE.UNIQ_ID_REQUIRE'
        );
    }
}
