import { Service, inject } from '@angular/core';
import {
    isParticipantsStatus,
    ParticipantsEntity,
    ParticipantsProps,
} from '@cmz/team-organization-domain';
import {
    ApiError,
    MapperUtils,
    PaginatedMapper,
    RolesMapper,
} from '@cmz/shared-data';
import { ParticipantsItemApiDto } from '../dtos/participants-response-api.dto';

@Service()
export class ParticipantsMapper extends PaginatedMapper<
    ParticipantsEntity,
    ParticipantsItemApiDto
> {
    private readonly rolesMapper = inject(RolesMapper);
    private readonly entityCache = new Map<string, ParticipantsEntity>();

    protected mapItemFromDto(dto: ParticipantsItemApiDto): ParticipantsEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        if (!isParticipantsStatus(dto.status)) {
            throw ApiError.invalidResponse(
                `ParticipantsStatus wire inconnue: ${dto.status}`
            );
        }
        // Fidèle au mapper source : porte le NOM de l'équipe (≠ find-one).
        const team = dto.team?.uniq_id ? dto.team.name : null;

        const props: ParticipantsProps = {
            uniqId: dto.id,
            firstName: dto.first_name,
            lastName: dto.last_name,
            email: dto.email,
            phone: dto.phone,
            role: this.rolesMapper.mapFromDto(dto.role),
            team,
            status: dto.status,
            updatedAt: dto.updated_at,
        };

        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new ParticipantsEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
