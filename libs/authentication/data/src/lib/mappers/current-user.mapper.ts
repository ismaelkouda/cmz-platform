import { AuthToken, CurrentUser, UserPermission } from '@cmz/shared-domain';
import {
    AuthTokenApiDto,
    CurrentUserApiDto,
    UserPermissionApiDto,
} from '../dtos/current-user-api.dto';

/**
 * Fonctions pures wire → domaine (snake_case → camelCase). Utilisées
 * uniquement par `login` (seule opération à retourner une session réelle —
 * décision 1 du plan).
 */
export function mapUserPermissionFromDto(
    dto: UserPermissionApiDto
): UserPermission {
    return {
        id: dto.id,
        level: dto.level,
        title: dto.title,
        label: dto.label,
        code: dto.code,
        headCode: dto.head_code,
        icon: dto.icon,
        path: dto.path,
        type: dto.type,
        active: dto.active,
        expanded: dto.expanded,
        statut: dto.statut,
        children: dto.children?.map(mapUserPermissionFromDto),
    };
}

export function mapCurrentUserFromDto(dto: CurrentUserApiDto): CurrentUser {
    return {
        id: dto.id,
        lastName: dto.last_name,
        firstName: dto.first_name,
        email: dto.email,
        profile: dto.profile,
        phone: dto.phone,
        isAdmin: dto.is_admin,
        enable2fa: dto.enable2fa,
        status: dto.status,
        photo: dto.photo,
        permissions: dto.permissions.map(mapUserPermissionFromDto),
        paths: dto.paths,
        actions: dto.actions,
    };
}

export function mapAuthTokenFromDto(dto: AuthTokenApiDto): AuthToken {
    return {
        value: dto.value,
        expiresAt: dto.expires_at,
    };
}
