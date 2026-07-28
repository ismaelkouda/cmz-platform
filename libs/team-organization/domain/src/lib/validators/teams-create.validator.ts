import { GenericRequiredError } from '@cmz/shared-domain';
import { TeamsCreateContract } from '../contracts/teams-create.contract';
import { TeamsCreateValidateContract } from '../contracts/teams-create.validate-contract';

export function validateTeamsCreate(
    contract: TeamsCreateContract
): asserts contract is TeamsCreateValidateContract {
    if (!contract.name) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.TEAMS.FORM.ERROR.CREATE.NAME_REQUIRE'
        );
    }
    if (!contract.description) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.TEAMS.FORM.ERROR.CREATE.DESCRIPTION_REQUIRE'
        );
    }
    if (!contract.reportTypes?.length) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.TEAMS.FORM.ERROR.CREATE.REPORT_TYPES_REQUIRE'
        );
    }
    if (!contract.operators?.length) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.TEAMS.FORM.ERROR.CREATE.OPERATORS_REQUIRE'
        );
    }
}
