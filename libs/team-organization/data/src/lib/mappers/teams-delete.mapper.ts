import { TeamsDeleteValidateContract } from '@cmz/team-organization-domain';
import { TeamsDeleteApiDto } from '../dtos/teams-delete-api.dto';

export function teamsDeleteMapper(
    validContract: TeamsDeleteValidateContract
): TeamsDeleteApiDto {
    return { uniq_id: validContract.uniqId };
}
