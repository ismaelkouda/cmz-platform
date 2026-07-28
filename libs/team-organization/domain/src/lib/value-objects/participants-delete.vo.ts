import { ParticipantsDeleteContract } from '../contracts/participants-delete.contract';
import { ParticipantsDeleteValidateContract } from '../contracts/participants-delete.validate-contract';
import { validateParticipantsDelete } from '../validators/participants-delete.validator';

export function participantsDeleteVo(
    contract: ParticipantsDeleteContract
): ParticipantsDeleteValidateContract {
    validateParticipantsDelete(contract);
    return contract;
}
