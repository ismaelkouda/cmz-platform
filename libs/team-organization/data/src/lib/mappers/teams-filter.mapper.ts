import {
    TeamsFilterContract,
    TeamsStatus,
} from '@cmz/team-organization-domain';
import { TeamsFilterApiDto } from '../dtos/teams-filter-api.dto';

export function teamsFilterMapper(
    validContract: TeamsFilterContract
): TeamsFilterApiDto {
    const params: TeamsFilterApiDto = {};
    if (validContract.search) {
        params.search = validContract.search;
    }
    if (validContract.status !== undefined) {
        params.is_active = validContract.status === TeamsStatus.ACTIVE;
    }
    return params;
}
