import { ParticipantsFindOneFilterValidateContract } from '@cmz/team-organization-domain';
import { ParticipantsFindOneFilterApiDto } from '../dtos/participants-find-one-filter-api.dto';

export function participantsFindOneFilterMapper(
    validContract: ParticipantsFindOneFilterValidateContract
): ParticipantsFindOneFilterApiDto {
    return { id: validContract.uniqId };
}
