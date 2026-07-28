import { Service } from '@angular/core';
import {
    AccessLogsEntity,
    AccessLogsProps,
    isAccessLogsAction,
} from '@cmz/settings-security-domain';
import { ApiError, MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { AccessLogsItemApiDto } from '../dtos/access-logs-response-api.dto';

/**
 * Fix par rapport au source : `action` (string large au wire) est validé
 * et typé ici via `isAccessLogsAction` — le source laisse
 * `AccessLogsEntity.action: string` non validé (son
 * `AccessLogsActionsMapper.mapToEnum` existe mais n'est jamais appelé sur
 * ce chemin de lecture, code mort qu'on corrige).
 */
@Service()
export class AccessLogsMapper extends PaginatedMapper<
    AccessLogsEntity,
    AccessLogsItemApiDto
> {
    private readonly entityCache = new Map<string, AccessLogsEntity>();

    protected mapItemFromDto(dto: AccessLogsItemApiDto): AccessLogsEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        if (!isAccessLogsAction(dto.action)) {
            throw ApiError.invalidResponse(
                `AccessLogsAction wire inconnue: ${dto.action}`
            );
        }

        const props: AccessLogsProps = {
            uniqId: dto.id,
            action: dto.action,
            source: dto.source,
            userAgent: dto.used_agent,
            createdAt: dto.created_at,
        };

        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new AccessLogsEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
