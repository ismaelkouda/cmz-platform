import { GenericRequiredError } from '@cmz/shared-domain';
import { ParticipantsDeleteContract } from '../contracts/participants-delete.contract';
import { ParticipantsDeleteValidateContract } from '../contracts/participants-delete.validate-contract';

export function validateParticipantsDelete(
    contract: ParticipantsDeleteContract
): asserts contract is ParticipantsDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.PARTICIPANTS.FORM.ERROR.DELETE.UNIQ_ID_REQUIRE'
        );
    }
}
