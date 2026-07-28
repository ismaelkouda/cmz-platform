import { TeamsEnableValidateContract } from '@cmz/team-organization-domain';
import { TeamsEnableApiDto } from '../dtos/teams-enable-api.dto';

export function teamsEnableMapper(
    validContract: TeamsEnableValidateContract
): TeamsEnableApiDto {
    return { uniq_id: validContract.uniqId };
}
