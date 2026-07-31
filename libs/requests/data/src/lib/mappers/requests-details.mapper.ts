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
    RequestsDetailsEntity,
    RequestsDetailsProps,
    RequestsDetailsQualificationState,
    RequestsDetailsStatus,
} from '@cmz/requests-domain';
import { TypeReport } from '@cmz/shared-domain';
import {
    RequestsDetailsItemApiDto,
    RequestsDetailsQualificationStateApiDto,
    RequestsDetailsStatusApiDto,
} from '../dtos/requests-details-api.dto';

const STATUS_MAP = new Map<RequestsDetailsStatusApiDto, RequestsDetailsStatus>([
    ['pending', RequestsDetailsStatus.PENDING],
    ['approved', RequestsDetailsStatus.APPROVED],
    ['rejected', RequestsDetailsStatus.REJECTED],
    ['abandoned', RequestsDetailsStatus.ABANDONED],
    ['in-progress', RequestsDetailsStatus.IN_PROGRESS],
    ['terminated', RequestsDetailsStatus.TERMINATED],
    ['confirmed', RequestsDetailsStatus.CONFIRMED],
]);

const QUALIFICATION_STATE_MAP = new Map<
    RequestsDetailsQualificationStateApiDto,
    RequestsDetailsQualificationState
>([
    ['pending', RequestsDetailsQualificationState.PENDING],
    ['completed', RequestsDetailsQualificationState.COMPLETED],
]);

@Service()
export class RequestsDetailsMapper extends SimpleResponseMapper<
    RequestsDetailsEntity,
    RequestsDetailsItemApiDto
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
    private readonly entityCache = new Map<string, RequestsDetailsEntity>();

    protected override mapItemFromDto(
        dto: RequestsDetailsItemApiDto
    ): RequestsDetailsEntity {
        MapperUtils.validateDto(dto, { required: ['uniq_id'] });

        const props: RequestsDetailsProps = {
            type: TypeReport.REQUESTS,
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
            status: STATUS_MAP.get(dto.status) ?? RequestsDetailsStatus.PENDING,
            qualificationState: dto.qualification_state
                ? (QUALIFICATION_STATE_MAP.get(dto.qualification_state) ?? null)
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
            : new RequestsDetailsEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
