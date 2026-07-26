import { Service } from '@angular/core';
import { Role } from '@cmz/shared-domain';
import { RolesDto } from '../dtos/roles.dto';
import { ApiError } from '../errors/api.error';

/**
 * Wire `roles` : leader = `team-leader` (≠ profiles/responsibilities: `leader`).
 */
@Service()
export class RolesMapper {
    private static readonly FROM_DTO: Record<RolesDto, Role> = {
        [RolesDto.SUPERVISOR]: Role.SUPERVISOR,
        [RolesDto['TEAM-LEADER']]: Role.LEADER,
        [RolesDto.AGENT]: Role.AGENT,
    };

    private static readonly TO_DTO: Record<Role, RolesDto> = {
        [Role.SUPERVISOR]: RolesDto.SUPERVISOR,
        [Role.LEADER]: RolesDto['TEAM-LEADER'],
        [Role.AGENT]: RolesDto.AGENT,
    };

    mapFromDto(dto: RolesDto | null): Role | null {
        if (dto == null) {
            return null;
        }
        const role = RolesMapper.FROM_DTO[dto];
        if (!role) {
            throw ApiError.invalidResponse(
                `RolesDto wire inconnue: ${String(dto)}`
            );
        }
        return role;
    }

    mapToDto(value: Role): RolesDto {
        return RolesMapper.TO_DTO[value];
    }
}
