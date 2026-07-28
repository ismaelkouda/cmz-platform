import { ParticipantsDisableValidateContract } from '@cmz/team-organization-domain';
import { ParticipantsDisableApiDto } from '../dtos/participants-disable-api.dto';

export function participantsDisableMapper(
    validContract: ParticipantsDisableValidateContract
): ParticipantsDisableApiDto {
    return { uniq_id: validContract.uniqId };
}
