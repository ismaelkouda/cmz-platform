import { ParticipantsUpdateContract } from '../contracts/participants-update.contract';
import { ParticipantsUpdateValidateContract } from '../contracts/participants-update.validate-contract';
import { validateParticipantsUpdate } from '../validators/participants-update.validator';

export function participantsUpdateVo(
    contract: ParticipantsUpdateContract
): ParticipantsUpdateValidateContract {
    validateParticipantsUpdate(contract);
    return contract;
}
