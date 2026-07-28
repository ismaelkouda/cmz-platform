import { TeamsDisableValidateContract } from '@cmz/team-organization-domain';
import { TeamsDisableApiDto } from '../dtos/teams-disable-api.dto';

export function teamsDisableMapper(
    validContract: TeamsDisableValidateContract
): TeamsDisableApiDto {
    return { uniq_id: validContract.uniqId };
}
