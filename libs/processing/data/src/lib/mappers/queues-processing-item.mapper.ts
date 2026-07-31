import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { ReportSourceMapper } from '@cmz/shared-data';
import { ReportTypeMapper } from '@cmz/shared-data';
import { TelecomOperatorMapper } from '@cmz/shared-data';
import { inject, Service } from '@angular/core';
import { QueuesProcessingEntity } from '@cmz/processing-domain';
import type { QueuesProcessingProps } from '@cmz/processing-domain';
import { TypeReport } from '@cmz/shared-domain';
import { QueuesProcessingItemApiDto } from '../dtos/queues-processing-response-api.dto';

@Service()
export class QueuesProcessingItemMapper extends PaginatedMapper<
    QueuesProcessingEntity,
    QueuesProcessingItemApiDto
> {
    private readonly reportTypeMapper = inject(ReportTypeMapper);
    private readonly telecomOperatorMapper = inject(TelecomOperatorMapper);
    private readonly reportSourceMapper = inject(ReportSourceMapper);
    private readonly entityCache = new Map<string, QueuesProcessingEntity>();

    protected override mapItemFromDto(
        dto: QueuesProcessingItemApiDto
    ): QueuesProcessingEntity {
        MapperUtils.validateDto(dto, { required: ['uniq_id'] });
        const props: QueuesProcessingProps = {
            type: TypeReport.PROCESSING,
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
            : new QueuesProcessingEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
