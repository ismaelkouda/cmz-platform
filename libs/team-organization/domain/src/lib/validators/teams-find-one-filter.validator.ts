import { GenericRequiredError } from '@cmz/shared-domain';
import { TeamsFindOneFilterContract } from '../contracts/teams-find-one-filter.contract';
import { TeamsFindOneFilterValidateContract } from '../contracts/teams-find-one-filter.validate-contract';

export function validateTeamsFindOneFilter(
    contract: TeamsFindOneFilterContract
): asserts contract is TeamsFindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.TEAMS.FORM.ERROR.FIND_ONE.UNIQ_ID_REQUIRE'
        );
    }
}
