import { GenericRequiredError } from '@cmz/shared-domain';
import { ParticipantsDisableContract } from '../contracts/participants-disable.contract';
import { ParticipantsDisableValidateContract } from '../contracts/participants-disable.validate-contract';

export function validateParticipantsDisable(
    contract: ParticipantsDisableContract
): asserts contract is ParticipantsDisableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.PARTICIPANTS.FORM.ERROR.DISABLE.UNIQ_ID_REQUIRE'
        );
    }
}
