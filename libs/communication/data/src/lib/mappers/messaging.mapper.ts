import { Service, inject } from '@angular/core';
import { MessagingEntity, MessagingProps } from '@cmz/communication-domain';
import { ApiError, MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { MessagingItemApiDto } from '../dtos/messaging-response-api.dto';
import { MessagingChannelMapper } from './messaging-channel.mapper';
import { MessagingTargetMapper } from './messaging-target.mapper';
import { MessagingTypeMapper } from './messaging-type.mapper';

/**
 * `type`/`targetType` : le mapper source laissait ces deux champs en wire
 * brut sur la liste (jamais passés dans `MessagingTypeMapper`/
 * `MessagingTargetMapper`, contrairement au détail) — bug corrigé ici, les
 * deux passent par les mappers comme sur `MessagingFindOneMapper`.
 */
@Service()
export class MessagingMapper extends PaginatedMapper<
    MessagingEntity,
    MessagingItemApiDto
> {
    private readonly typeMapper = inject(MessagingTypeMapper);
    private readonly targetMapper = inject(MessagingTargetMapper);
    private readonly channelMapper = inject(MessagingChannelMapper);
    private readonly entityCache = new Map<string, MessagingEntity>();

    protected mapItemFromDto(dto: MessagingItemApiDto): MessagingEntity {
        MapperUtils.validateDto(dto, { required: ['uniq_id'] });
        if (!dto.type || !dto.target_type) {
            throw ApiError.invalidResponse(
                'MessagingItemApiDto: type/target_type manquant'
            );
        }

        const props: MessagingProps = {
            uniqId: dto.uniq_id,
            reportId: dto.report_id,
            type: this.typeMapper.mapFromDto(dto.type),
            targetType: this.targetMapper.mapFromDto(dto.target_type),
            region: dto.region,
            department: dto.department,
            municipality: dto.municipality,
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
        const entity = cached ? cached.with(props) : new MessagingEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
