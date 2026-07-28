import { Service, inject } from '@angular/core';
import {
    NotificationsEntity,
    NotificationsProps,
} from '@cmz/communication-domain';
import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { NotificationsItemApiDto } from '../dtos/notifications-response-api.dto';
import { NotificationsStatusMapper } from './notifications-status.mapper';
import { NotificationsTypeReportMapper } from './notifications-type-report.mapper';

@Service()
export class NotificationsMapper extends PaginatedMapper<
    NotificationsEntity,
    NotificationsItemApiDto
> {
    private readonly statusMapper = inject(NotificationsStatusMapper);
    private readonly typeReportMapper = inject(NotificationsTypeReportMapper);
    private readonly entityCache = new Map<string, NotificationsEntity>();

    protected mapItemFromDto(
        dto: NotificationsItemApiDto
    ): NotificationsEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });

        const props: NotificationsProps = {
            uniqId: dto.id,
            reference: dto.model_id,
            title: dto.title,
            type: this.typeReportMapper.mapFromDto(dto.model_type),
            message: dto.message,
            status: this.statusMapper.mapFromDto(dto.status),
            sendAt: dto.sent_at,
            updatedAt: dto.updated_at,
        };

        const cacheKey = `dto:${props.uniqId}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new NotificationsEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
