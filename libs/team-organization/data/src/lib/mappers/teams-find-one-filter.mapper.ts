import { TeamsFindOneFilterValidateContract } from '@cmz/team-organization-domain';
import { TeamsFindOneFilterApiDto } from '../dtos/teams-find-one-filter-api.dto';

export function teamsFindOneFilterMapper(
    validContract: TeamsFindOneFilterValidateContract
): TeamsFindOneFilterApiDto {
    return { id: validContract.uniqId };
}
