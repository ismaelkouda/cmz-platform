import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { ReportSourceMapper } from '@cmz/shared-data';
import { ReportTypeMapper } from '@cmz/shared-data';
import { TelecomOperatorMapper } from '@cmz/shared-data';
import { inject, Service } from '@angular/core';
import { AllProcessingEntity } from '@cmz/processing-domain';
import type { AllProcessingProps } from '@cmz/processing-domain';
import { TypeReport } from '@cmz/shared-domain';
import { AllProcessingItemApiDto } from '../dtos/all-processing-response-api.dto';

@Service()
export class AllProcessingItemMapper extends PaginatedMapper<
    AllProcessingEntity,
    AllProcessingItemApiDto
> {
    private readonly reportTypeMapper = inject(ReportTypeMapper);
    private readonly telecomOperatorMapper = inject(TelecomOperatorMapper);
    private readonly reportSourceMapper = inject(ReportSourceMapper);
    private readonly entityCache = new Map<string, AllProcessingEntity>();

    protected override mapItemFromDto(
        dto: AllProcessingItemApiDto
    ): AllProcessingEntity {
        MapperUtils.validateDto(dto, { required: ['uniq_id'] });
        const props: AllProcessingProps = {
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
            : new AllProcessingEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
