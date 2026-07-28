import { ParticipantsDeleteValidateContract } from '@cmz/team-organization-domain';
import { ParticipantsDeleteApiDto } from '../dtos/participants-delete-api.dto';

export function participantsDeleteMapper(
    validContract: ParticipantsDeleteValidateContract
): ParticipantsDeleteApiDto {
    return { uniq_id: validContract.uniqId };
}
