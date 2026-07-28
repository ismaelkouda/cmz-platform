import { GenericRequiredError } from '@cmz/shared-domain';
import { TeamsDeleteContract } from '../contracts/teams-delete.contract';
import { TeamsDeleteValidateContract } from '../contracts/teams-delete.validate-contract';

export function validateTeamsDelete(
    contract: TeamsDeleteContract
): asserts contract is TeamsDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.TEAMS.FORM.ERROR.DELETE.UNIQ_ID_REQUIRE'
        );
    }
}
