import { Service, inject } from '@angular/core';
import {
    UsersFindOneEntity,
    UsersFindOneProps,
} from '@cmz/settings-security-domain';
import {
    MapperUtils,
    RolesMapper,
    SimpleResponseMapper,
} from '@cmz/shared-data';
import { UsersFindOneItemApiDto } from '../dtos/users-find-one-response-api.dto';

/**
 * Fix par rapport au source : `UsersFindOneItemApiDto.role` (wire brut,
 * non traduit dans le mapper source) est ici passé par `RolesMapper`,
 * comme sur la liste — élimine l'incohérence de typage entre liste et
 * détail confirmée en lisant le source (`users-find-one.mapper.ts`
 * n'appliquait pas `RolesMapper`, contrairement à `users.mapper.ts`).
 * `profile` porte l'ID ici (détail) — pré-remplit le select du formulaire.
 */
@Service()
export class UsersFindOneMapper extends SimpleResponseMapper<
    UsersFindOneEntity,
    UsersFindOneItemApiDto
> {
    private readonly rolesMapper = inject(RolesMapper);
    private readonly entityCache = new Map<string, UsersFindOneEntity>();

    protected mapItemFromDto(dto: UsersFindOneItemApiDto): UsersFindOneEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });

        const props: UsersFindOneProps = {
            uniqId: dto.id,
            firstName: dto.first_name,
            lastName: dto.last_name,
            email: dto.email,
            phone: dto.phone,
            profile: dto.profile_id,
            role: this.rolesMapper.mapFromDto(dto.role),
            updatedAt: dto.updated_at,
        };

        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new UsersFindOneEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
