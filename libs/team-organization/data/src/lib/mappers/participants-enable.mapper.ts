import { ParticipantsEnableValidateContract } from '@cmz/team-organization-domain';
import { ParticipantsEnableApiDto } from '../dtos/participants-enable-api.dto';

export function participantsEnableMapper(
    validContract: ParticipantsEnableValidateContract
): ParticipantsEnableApiDto {
    return { uniq_id: validContract.uniqId };
}
