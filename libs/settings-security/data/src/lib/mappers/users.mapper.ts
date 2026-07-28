import { Service, inject } from '@angular/core';
import {
    UsersEntity,
    UsersProps,
    isUsersStatus,
} from '@cmz/settings-security-domain';
import {
    ApiError,
    MapperUtils,
    PaginatedMapper,
    RolesMapper,
} from '@cmz/shared-data';
import { UsersItemApiDto } from '../dtos/users-response-api.dto';

/**
 * `profile` porte le NOM ici (liste) — diverge du détail (`UsersFindOneMapper`,
 * id) ; même précédent que `team-organization/participants.team`.
 */
@Service()
export class UsersMapper extends PaginatedMapper<UsersEntity, UsersItemApiDto> {
    private readonly rolesMapper = inject(RolesMapper);
    private readonly entityCache = new Map<string, UsersEntity>();

    protected mapItemFromDto(dto: UsersItemApiDto): UsersEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        if (!isUsersStatus(dto.status)) {
            throw ApiError.invalidResponse(
                `UsersStatus wire inconnue: ${dto.status}`
            );
        }

        const props: UsersProps = {
            uniqId: dto.id,
            firstName: dto.first_name,
            lastName: dto.last_name,
            email: dto.email,
            phone: dto.phone,
            profile: dto.profile,
            role: this.rolesMapper.mapFromDto(dto.role),
            status: dto.status,
            updatedAt: dto.updated_at,
        };

        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached ? cached.with(props) : new UsersEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
