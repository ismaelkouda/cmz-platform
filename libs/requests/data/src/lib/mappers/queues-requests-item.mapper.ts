import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { ReportSourceMapper } from '@cmz/shared-data';
import { ReportTypeMapper } from '@cmz/shared-data';
import { TelecomOperatorMapper } from '@cmz/shared-data';
import { inject, Service } from '@angular/core';
import { QueuesRequestsEntity } from '@cmz/requests-domain';
import type { QueuesRequestsProps } from '@cmz/requests-domain';
import { TypeReport } from '@cmz/shared-domain';
import { QueuesRequestsItemApiDto } from '../dtos/queues-requests-response-api.dto';

@Service()
export class QueuesRequestsItemMapper extends PaginatedMapper<
    QueuesRequestsEntity,
    QueuesRequestsItemApiDto
> {
    private readonly reportTypeMapper = inject(ReportTypeMapper);
    private readonly telecomOperatorMapper = inject(TelecomOperatorMapper);
    private readonly reportSourceMapper = inject(ReportSourceMapper);
    private readonly entityCache = new Map<string, QueuesRequestsEntity>();

    protected override mapItemFromDto(
        dto: QueuesRequestsItemApiDto
    ): QueuesRequestsEntity {
        MapperUtils.validateDto(dto, { required: ['uniq_id'] });
        const props: QueuesRequestsProps = {
            type: TypeReport.REQUESTS,
            uniqId: dto.uniq_id,
            reportType: this.reportTypeMapper.mapFromDto(dto.report_type),
            operators: (dto.operators ?? []).map((operator) =>
                this.telecomOperatorMapper.mapFromDto(operator)
            ),
            source: this.reportSourceMapper.mapFromDto(dto.source),
            initiatorPhoneNumber: dto.initiator_phone_number ?? '',
            reportedAt: dto.reported_at ?? '',
            updatedAt: dto.updated_at ?? '',
        };
        const cacheKey = `dto:${dto.uniq_id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new QueuesRequestsEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
