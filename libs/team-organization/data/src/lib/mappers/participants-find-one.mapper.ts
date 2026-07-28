import { Service, inject } from '@angular/core';
import {
    ParticipantsFindOneEntity,
    ParticipantsFindOneProps,
} from '@cmz/team-organization-domain';
import {
    MapperUtils,
    RolesMapper,
    SimpleResponseMapper,
} from '@cmz/shared-data';
import { ParticipantsFindOneItemApiDto } from '../dtos/participants-find-one-response-api.dto';

@Service()
export class ParticipantsFindOneMapper extends SimpleResponseMapper<
    ParticipantsFindOneEntity,
    ParticipantsFindOneItemApiDto
> {
    private readonly rolesMapper = inject(RolesMapper);
    private readonly entityCache = new Map<string, ParticipantsFindOneEntity>();

    protected mapItemFromDto(
        dto: ParticipantsFindOneItemApiDto
    ): ParticipantsFindOneEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        // Fidèle au mapper source : porte l'UNIQID de l'équipe (≠ liste).
        const team = dto.team?.uniq_id ?? null;

        const props: ParticipantsFindOneProps = {
            uniqId: dto.id,
            firstName: dto.first_name,
            lastName: dto.last_name,
            email: dto.email,
            phone: dto.phone,
            role: this.rolesMapper.mapFromDto(dto.role),
            team,
            updatedAt: dto.updated_at,
        };

        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new ParticipantsFindOneEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
