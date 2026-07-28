import { ParticipantsEnableContract } from '../contracts/participants-enable.contract';
import { ParticipantsEnableValidateContract } from '../contracts/participants-enable.validate-contract';
import { validateParticipantsEnable } from '../validators/participants-enable.validator';

export function participantsEnableVo(
    contract: ParticipantsEnableContract
): ParticipantsEnableValidateContract {
    validateParticipantsEnable(contract);
    return contract;
}
