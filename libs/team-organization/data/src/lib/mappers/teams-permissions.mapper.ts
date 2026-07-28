import { Service } from '@angular/core';
import { TeamsPermissionOption } from '@cmz/team-organization-domain';
import { SimpleResponseMapper } from '@cmz/shared-data';
import { TeamsPermissionNodeApiDto } from '../dtos/teams-permission-node-api.dto';
import { flattenPermissionTree } from '../utils/flatten-permission-tree.util';

/**
 * `SimpleResponseMapper` (pas `ArrayResponseMapper`) : la réponse est bien
 * un tableau au wire (`SimpleResponseDto<TeamsPermissionNodeApiDto[]>`),
 * mais l'aplatissement doit se faire sur la forêt entière en une passe
 * (un nœud racine peut produire plusieurs options aplaties) — un mapping
 * item par item façon `ArrayResponseMapper` ne convient pas ici.
 */
@Service()
export class TeamsPermissionsMapper extends SimpleResponseMapper<
    TeamsPermissionOption[],
    TeamsPermissionNodeApiDto[]
> {
    protected mapItemFromDto(
        dto: TeamsPermissionNodeApiDto[]
    ): TeamsPermissionOption[] {
        return flattenPermissionTree(dto);
    }
}
