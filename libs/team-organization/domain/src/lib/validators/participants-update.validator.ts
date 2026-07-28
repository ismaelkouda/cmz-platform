import { GenericRequiredError } from '@cmz/shared-domain';
import { ParticipantsUpdateContract } from '../contracts/participants-update.contract';
import { ParticipantsUpdateValidateContract } from '../contracts/participants-update.validate-contract';

export function validateParticipantsUpdate(
    contract: ParticipantsUpdateContract
): asserts contract is ParticipantsUpdateValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.PARTICIPANTS.FORM.ERROR.UPDATE.UNIQ_ID_REQUIRE'
        );
    }
    if (!contract.firstName) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.PARTICIPANTS.FORM.ERROR.UPDATE.FIRST_NAME_REQUIRE'
        );
    }
    if (!contract.lastName) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.PARTICIPANTS.FORM.ERROR.UPDATE.LAST_NAME_REQUIRE'
        );
    }
    if (!contract.email) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.PARTICIPANTS.FORM.ERROR.UPDATE.EMAIL_REQUIRE'
        );
    }
    if (!contract.phone) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.PARTICIPANTS.FORM.ERROR.UPDATE.PHONE_REQUIRE'
        );
    }
}
