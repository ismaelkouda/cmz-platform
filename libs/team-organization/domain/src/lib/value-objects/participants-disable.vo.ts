import { ParticipantsDisableContract } from '../contracts/participants-disable.contract';
import { ParticipantsDisableValidateContract } from '../contracts/participants-disable.validate-contract';
import { validateParticipantsDisable } from '../validators/participants-disable.validator';

export function participantsDisableVo(
    contract: ParticipantsDisableContract
): ParticipantsDisableValidateContract {
    validateParticipantsDisable(contract);
    return contract;
}
