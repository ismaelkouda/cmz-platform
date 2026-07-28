import { ParticipantsFindOneFilterContract } from '../contracts/participants-find-one-filter.contract';
import { ParticipantsFindOneFilterValidateContract } from '../contracts/participants-find-one-filter.validate-contract';
import { validateParticipantsFindOneFilter } from '../validators/participants-find-one-filter.validator';

export function participantsFindOneFilterVo(
    contract: ParticipantsFindOneFilterContract
): ParticipantsFindOneFilterValidateContract {
    validateParticipantsFindOneFilter(contract);
    return contract;
}
