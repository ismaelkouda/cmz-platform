import { GenericRequiredError } from '@cmz/shared-domain';
import { ParticipantsCreateContract } from '../contracts/participants-create.contract';
import { ParticipantsCreateValidateContract } from '../contracts/participants-create.validate-contract';

export function validateParticipantsCreate(
    contract: ParticipantsCreateContract
): asserts contract is ParticipantsCreateValidateContract {
    if (!contract.firstName) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.PARTICIPANTS.FORM.ERROR.CREATE.FIRST_NAME_REQUIRE'
        );
    }
    if (!contract.lastName) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.PARTICIPANTS.FORM.ERROR.CREATE.LAST_NAME_REQUIRE'
        );
    }
    if (!contract.email) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.PARTICIPANTS.FORM.ERROR.CREATE.EMAIL_REQUIRE'
        );
    }
    if (!contract.phone) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.PARTICIPANTS.FORM.ERROR.CREATE.PHONE_REQUIRE'
        );
    }
}
