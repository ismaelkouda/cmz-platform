import { Service } from '@angular/core';
import { PermissionTreeNode } from '@cmz/settings-security-domain';
import { SimpleResponseMapper } from '@cmz/shared-data';
import { PermissionApiDto } from '../dtos/profiles-permissions-find-one-response-api.dto';
import { mapPermissionApiNode } from './permission-tree-node.mapper.util';

/**
 * `SimpleResponseMapper<PermissionTreeNode[], PermissionApiDto[]>` : la
 * réponse est un tableau au wire, mappé en une passe (même précédent que
 * `team-organization/TeamsPermissionsMapper`).
 */
@Service()
export class ProfilesPermissionsPermissionsMapper extends SimpleResponseMapper<
    PermissionTreeNode[],
    PermissionApiDto[]
> {
    protected mapItemFromDto(dto: PermissionApiDto[]): PermissionTreeNode[] {
        return dto.map((node) => mapPermissionApiNode(node));
    }
}
