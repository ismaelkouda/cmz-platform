import { MapperUtils, SimpleResponseMapper } from '@cmz/shared-data';
import { ActorMapper } from '@cmz/shared-data';
import { AdministrativeBoundaryMapper } from '@cmz/shared-data';
import { LocationMapper } from '@cmz/shared-data';
import { ReportMediaMapper } from '@cmz/shared-data';
import { ReportSourceMapper } from '@cmz/shared-data';
import { ReportTypeMapper } from '@cmz/shared-data';
import { TelecomOperatorMapper } from '@cmz/shared-data';
import { TimestampsMapper } from '@cmz/shared-data';
import { TreaterInfoMapper } from '@cmz/shared-data';
import { inject, Service } from '@angular/core';
import {
    FinalizationDetailsEntity,
    FinalizationDetailsProps,
    FinalizationDetailsFinalizationState,
    FinalizationDetailsStatus,
} from '@cmz/finalization-domain';
import { TypeReport } from '@cmz/shared-domain';
import {
    FinalizationDetailsItemApiDto,
    FinalizationDetailsFinalizationStateApiDto,
    FinalizationDetailsStatusApiDto,
} from '../dtos/finalization-details-api.dto';

const STATUS_MAP = new Map<
    FinalizationDetailsStatusApiDto,
    FinalizationDetailsStatus
>([
    ['pending', FinalizationDetailsStatus.PENDING],
    ['approved', FinalizationDetailsStatus.APPROVED],
    ['rejected', FinalizationDetailsStatus.REJECTED],
    ['abandoned', FinalizationDetailsStatus.ABANDONED],
    ['in-progress', FinalizationDetailsStatus.IN_PROGRESS],
    ['terminated', FinalizationDetailsStatus.TERMINATED],
    ['confirmed', FinalizationDetailsStatus.CONFIRMED],
]);

const QUALIFICATION_STATE_MAP = new Map<
    FinalizationDetailsFinalizationStateApiDto,
    FinalizationDetailsFinalizationState
>([
    ['pending', FinalizationDetailsFinalizationState.PENDING],
    ['in-progress', FinalizationDetailsFinalizationState.IN_PROGRESS],
    ['completed', FinalizationDetailsFinalizationState.COMPLETED],
]);

@Service()
export class FinalizationDetailsMapper extends SimpleResponseMapper<
    FinalizationDetailsEntity,
    FinalizationDetailsItemApiDto
> {
    private readonly actorMapper = inject(ActorMapper);
    private readonly reportSourceMapper = inject(ReportSourceMapper);
    private readonly reportTypeMapper = inject(ReportTypeMapper);
    private readonly locationMapper = inject(LocationMapper);
    private readonly telecomOperatorMapper = inject(TelecomOperatorMapper);
    private readonly reportMediaMapper = inject(ReportMediaMapper);
    private readonly treaterInfoMapper = inject(TreaterInfoMapper);
    private readonly administrativeBoundaryMapper = inject(
        AdministrativeBoundaryMapper
    );
    private readonly timestampsMapper = inject(TimestampsMapper);
    private readonly entityCache = new Map<string, FinalizationDetailsEntity>();

    protected override mapItemFromDto(
        dto: FinalizationDetailsItemApiDto
    ): FinalizationDetailsEntity {
        MapperUtils.validateDto(dto, { required: ['uniq_id'] });

        const props: FinalizationDetailsProps = {
            type: TypeReport.FINALIZATION,
            uniqId: dto.uniq_id,
            reportUniqId: dto.request_report_uniq_id ?? '',
            initiatorPhone: dto.initiator_phone_number ?? '',
            initiator: this.actorMapper.mapToEntity(dto.initiator),
            acknowledgedBy: this.actorMapper.mapToEntity(dto.acknowledged_by),
            processedBy: this.actorMapper.mapToEntity(dto.processed_by),
            finalizedBy: this.actorMapper.mapToEntity(dto.finalized_by),
            approvedBy: this.actorMapper.mapToEntity(dto.approved_by),
            rejectedBy: this.actorMapper.mapToEntity(dto.rejected_by),
            confirmedBy: this.actorMapper.mapToEntity(dto.confirmed_by),
            abandonedBy: this.actorMapper.mapToEntity(dto.abandoned_by),
            source: this.reportSourceMapper.mapFromDto(dto.source),
            location: this.locationMapper.mapToEntity(dto),
            reportType: this.reportTypeMapper.mapFromDto(dto.report_type),
            operators: (dto.operators ?? []).map((operator) =>
                this.telecomOperatorMapper.mapFromDto(operator)
            ),
            description: dto.description ?? '',
            media: this.reportMediaMapper.mapToEntity({
                place_photo: dto.place_photo,
                access_place_photo: dto.access_place_photo,
            }),
            treater: this.treaterInfoMapper.mapToEntity(dto),
            status:
                STATUS_MAP.get(dto.status) ?? FinalizationDetailsStatus.PENDING,
            finalizationState: dto.finalization_state
                ? (QUALIFICATION_STATE_MAP.get(dto.finalization_state) ?? null)
                : null,
            region: this.administrativeBoundaryMapper.mapToEntity(dto.region),
            department: this.administrativeBoundaryMapper.mapToEntity(
                dto.department
            ),
            municipality: this.administrativeBoundaryMapper.mapToEntity(
                dto.municipality
            ),
            timestamps: this.timestampsMapper.mapToEntity(dto),
            createdAt: dto.created_at ?? '',
            updatedAt: dto.updated_at ?? '',
            reportedAt: dto.reported_at ?? '',
            placePhoto: dto.place_photo ?? '',
            accessPlacePhoto: dto.access_place_photo ?? '',
            confirmCount: dto.confirm_count ?? 0,
            placeDescription: dto.place_description ?? '',
        };

        const cacheKey = `dto:${dto.uniq_id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new FinalizationDetailsEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
