import { ParticipantsCreateContract } from '../contracts/participants-create.contract';
import { ParticipantsCreateValidateContract } from '../contracts/participants-create.validate-contract';
import { validateParticipantsCreate } from '../validators/participants-create.validator';

export function participantsCreateVo(
    contract: ParticipantsCreateContract
): ParticipantsCreateValidateContract {
    validateParticipantsCreate(contract);
    return contract;
}
