import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { inject, Service } from '@angular/core';
import { DownloadReportStatesEntity } from '@cmz/report-states-domain';
import type { DownloadReportStatesProps } from '@cmz/report-states-domain';
import { DownloadReportStatesItemApiDto } from '../dtos/download-report-states-response-api.dto';
import { DownloadReportStatesStatusMapper } from './download-report-states-status.mapper';
import { DownloadReportStatesTypeMapper } from './download-report-states-type.mapper';

@Service()
export class DownloadReportStatesItemMapper extends PaginatedMapper<
    DownloadReportStatesEntity,
    DownloadReportStatesItemApiDto
> {
    private readonly statusMapper = inject(DownloadReportStatesStatusMapper);
    private readonly typeMapper = inject(DownloadReportStatesTypeMapper);
    private readonly entityCache = new Map<
        string,
        DownloadReportStatesEntity
    >();

    protected override mapItemFromDto(
        dto: DownloadReportStatesItemApiDto
    ): DownloadReportStatesEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: DownloadReportStatesProps = {
            uniqId: dto.id,
            url: dto.download_url ?? '',
            name: dto.file_name ?? '',
            size: dto.file_size ?? 0,
            type: this.typeMapper.mapFromDto(dto.format),
            status: this.statusMapper.mapFromDto(dto.status),
            filters: (dto.filters ?? []).map((item) => ({
                name: item.key_label,
                value: item.value_label,
            })),
            createdAt: dto.created_at ?? '',
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new DownloadReportStatesEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
