import { TeamsUpdateValidateContract } from '@cmz/team-organization-domain';
import { TeamsUpdateApiDto } from '../dtos/teams-update-api.dto';

export function teamsUpdateMapper(
    validContract: TeamsUpdateValidateContract
): TeamsUpdateApiDto {
    const params = {} as TeamsUpdateApiDto;
    params.id = validContract.uniqId;
    params.name = validContract.name;
    params.description = validContract.description;
    params.operators = validContract.operators;
    params.report_types = validContract.reportTypes;
    if (validContract.permissions?.length) {
        params.permissions = validContract.permissions.map(Number);
    }
    return params;
}
