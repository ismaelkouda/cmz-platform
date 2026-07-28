import { Service } from '@angular/core';
import { isReportType, isTelecomOperator } from '@cmz/shared-domain';
import {
    TeamsFindOneEntity,
    TeamsFindOneProps,
} from '@cmz/team-organization-domain';
import { MapperUtils, SimpleResponseMapper } from '@cmz/shared-data';
import { TeamsFindOneItemApiDto } from '../dtos/teams-find-one-response-api.dto';
import { flattenPermissionTree } from '../utils/flatten-permission-tree.util';

@Service()
export class TeamsFindOneMapper extends SimpleResponseMapper<
    TeamsFindOneEntity,
    TeamsFindOneItemApiDto
> {
    private readonly entityCache = new Map<string, TeamsFindOneEntity>();

    protected mapItemFromDto(dto: TeamsFindOneItemApiDto): TeamsFindOneEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: TeamsFindOneProps = {
            uniqId: dto.id,
            code: dto.code ?? null,
            name: dto.name ?? null,
            description: dto.description ?? null,
            reportTypes: (dto.report_types ?? []).filter(isReportType),
            operators: (dto.operators ?? []).filter(isTelecomOperator),
            permissions: flattenPermissionTree(dto.permissions_json),
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new TeamsFindOneEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
