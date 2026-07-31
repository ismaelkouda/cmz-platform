import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { ReportSourceMapper } from '@cmz/shared-data';
import { ReportTypeMapper } from '@cmz/shared-data';
import { TelecomOperatorMapper } from '@cmz/shared-data';
import { inject, Service } from '@angular/core';
import { AllRequestsEntity } from '@cmz/requests-domain';
import type { AllRequestsProps } from '@cmz/requests-domain';
import { TypeReport } from '@cmz/shared-domain';
import { AllRequestsItemApiDto } from '../dtos/all-requests-response-api.dto';

@Service()
export class AllRequestsItemMapper extends PaginatedMapper<
    AllRequestsEntity,
    AllRequestsItemApiDto
> {
    private readonly reportTypeMapper = inject(ReportTypeMapper);
    private readonly telecomOperatorMapper = inject(TelecomOperatorMapper);
    private readonly reportSourceMapper = inject(ReportSourceMapper);
    private readonly entityCache = new Map<string, AllRequestsEntity>();

    protected override mapItemFromDto(
        dto: AllRequestsItemApiDto
    ): AllRequestsEntity {
        MapperUtils.validateDto(dto, { required: ['uniq_id'] });
        const props: AllRequestsProps = {
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
            : new AllRequestsEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
