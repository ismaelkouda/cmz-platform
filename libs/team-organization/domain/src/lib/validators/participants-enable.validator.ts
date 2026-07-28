import { GenericRequiredError } from '@cmz/shared-domain';
import { ParticipantsEnableContract } from '../contracts/participants-enable.contract';
import { ParticipantsEnableValidateContract } from '../contracts/participants-enable.validate-contract';

export function validateParticipantsEnable(
    contract: ParticipantsEnableContract
): asserts contract is ParticipantsEnableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.PARTICIPANTS.FORM.ERROR.ENABLE.UNIQ_ID_REQUIRE'
        );
    }
}
