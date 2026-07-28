import { GenericRequiredError } from '@cmz/shared-domain';
import { TeamsUpdateContract } from '../contracts/teams-update.contract';
import { TeamsUpdateValidateContract } from '../contracts/teams-update.validate-contract';

export function validateTeamsUpdate(
    contract: TeamsUpdateContract
): asserts contract is TeamsUpdateValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.TEAMS.FORM.ERROR.UPDATE.UNIQ_ID_REQUIRE'
        );
    }
    if (!contract.name) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.TEAMS.FORM.ERROR.UPDATE.NAME_REQUIRE'
        );
    }
    if (!contract.description) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.TEAMS.FORM.ERROR.UPDATE.DESCRIPTION_REQUIRE'
        );
    }
    if (!contract.reportTypes?.length) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.TEAMS.FORM.ERROR.UPDATE.REPORT_TYPES_REQUIRE'
        );
    }
    if (!contract.operators?.length) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.TEAMS.FORM.ERROR.UPDATE.OPERATORS_REQUIRE'
        );
    }
}
