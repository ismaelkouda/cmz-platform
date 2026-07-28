import { ParticipantsFilterContract } from '../contracts/participants-filter.contract';
import { validateParticipantsFilter } from '../validators/participants-filter.validator';

export function participantsFilterVo(
    contract: ParticipantsFilterContract
): ParticipantsFilterContract {
    validateParticipantsFilter(contract);
    return contract;
}
