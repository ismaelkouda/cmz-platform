import { TeamsCreateValidateContract } from '@cmz/team-organization-domain';
import { TeamsCreateApiDto } from '../dtos/teams-create-api.dto';

export function teamsCreateMapper(
    validContract: TeamsCreateValidateContract
): TeamsCreateApiDto {
    const params = {} as TeamsCreateApiDto;
    params.name = validContract.name;
    params.description = validContract.description;
    params.operators = validContract.operators;
    params.report_types = validContract.reportTypes;
    if (validContract.permissions?.length) {
        params.permissions = validContract.permissions.map(Number);
    }
    return params;
}
