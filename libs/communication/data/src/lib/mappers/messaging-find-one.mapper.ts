import { Service, inject } from '@angular/core';
import {
    MessagingFindOneEntity,
    MessagingFindOneProps,
} from '@cmz/communication-domain';
import { ApiError, MapperUtils, SimpleResponseMapper } from '@cmz/shared-data';
import { MessagingFindOneItemApiDto } from '../dtos/messaging-find-one-response-api.dto';
import { MessagingChannelMapper } from './messaging-channel.mapper';
import { MessagingTargetMapper } from './messaging-target.mapper';
import { MessagingTypeMapper } from './messaging-type.mapper';

/**
 * Bug corrigé : le mapper source dérivait les ids via
 * `JSON.stringify(dto.region?.id)` — `JSON.stringify` sur une string
 * entoure la valeur de guillemets littéraux (`'"abc"'` au lieu de `'abc'`),
 * cassant le matching contre les options du select cascade en édition.
 * Remplacé par un accès direct `dto.region?.id ?? ''`.
 */
@Service()
export class MessagingFindOneMapper extends SimpleResponseMapper<
    MessagingFindOneEntity,
    MessagingFindOneItemApiDto
> {
    private readonly typeMapper = inject(MessagingTypeMapper);
    private readonly targetMapper = inject(MessagingTargetMapper);
    private readonly channelMapper = inject(MessagingChannelMapper);
    private readonly entityCache = new Map<string, MessagingFindOneEntity>();

    protected mapItemFromDto(
        dto: MessagingFindOneItemApiDto
    ): MessagingFindOneEntity {
        MapperUtils.validateDto(dto, { required: ['uniq_id'] });
        if (!dto.type || !dto.target_type) {
            throw ApiError.invalidResponse(
                'MessagingFindOneItemApiDto: type/target_type manquant'
            );
        }

        const props: MessagingFindOneProps = {
            uniqId: dto.uniq_id,
            reportId: dto.report_uniq_id,
            type: this.typeMapper.mapFromDto(dto.type),
            targetType: this.targetMapper.mapFromDto(dto.target_type),
            region: dto.region?.id ?? '',
            department: dto.department?.id ?? '',
            municipality: dto.municipality?.id ?? '',
            channels: (dto.channels ?? []).map((channel) =>
                this.channelMapper.mapFromDto(channel)
            ),
            subject: dto.subject,
            content: dto.content,
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };

        const cacheKey = `dto:${dto.uniq_id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new MessagingFindOneEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
