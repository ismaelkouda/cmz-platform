import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it } from 'vitest';
import {
    ActorMapper,
    AdministrativeBoundaryMapper,
    LocationMapper,
    LocationMethodDto,
    LocationMethodMapper,
    LocationTypeDto,
    LocationTypeMapper,
    ReportMediaMapper,
    ReportSourceMapper,
    ReportTypeMapper,
    TelecomOperatorMapper,
    TimestampsMapper,
    TreaterInfoMapper,
} from '@cmz/shared-data';
import { ReportSource, ReportType, TelecomOperator } from '@cmz/shared-domain';
import {
    ReportStatesDetailsQualificationState,
    ReportStatesDetailsStatus,
} from '@cmz/report-states-domain';
import { ReportStatesDetailsMapper } from './report-states-details.mapper';
import type { ReportStatesDetailsItemApiDto } from '../dtos/report-states-details-api.dto';

/**
 * Backlog #11 (cartographie, 2026-08-04) — module `report-states`, 6/6
 * fichiers (module complet pour ce backlog). Le fichier le plus complexe :
 * 9 mappers injectés (`ActorMapper`, `ReportSourceMapper`,
 * `ReportTypeMapper`, `LocationMapper`, `TelecomOperatorMapper`,
 * `ReportMediaMapper`, `TreaterInfoMapper`, `AdministrativeBoundaryMapper`,
 * `TimestampsMapper`), marqué « verified » dans le corpus avec un oracle
 * `@cmz/report-states-data:test` — mais ce test passait déjà avant ce
 * fichier grâce à `report-states-details-mappers.spec.ts` (qui ne teste que
 * les 4 mappers request-side du même dossier, jamais celui-ci) : l'oracle
 * corpus « test » était donc vrai au niveau projet sans jamais exercer ce
 * mapper précis — même angle mort que celui documenté pour le chantier
 * « mappers concrets » (backlog #4), mais découvert ici sur un module
 * classé « corpus-couvert » plutôt que « manuel ».
 */
function makeItemDto(
    partial: Partial<ReportStatesDetailsItemApiDto> = {}
): ReportStatesDetailsItemApiDto {
    return {
        uniq_id: 'REQ-DETAILS-001',
        request_report_uniq_id: 'REP-001',
        source: ReportSource.APP,
        location_method: LocationMethodDto.AUTO,
        location_type: LocationTypeDto.GPS,
        lat: '3.86',
        long: '11.5',
        what3words: 'table.lampe.chaise',
        place_description: 'Près du marché',
        location_name: 'Yaoundé',
        report_type: ReportType.ABI,
        operators: [TelecomOperator.MTN],
        place_photo: 'photo.jpg',
        access_place_photo: 'https://cdn.example.com/photo.jpg',
        description: 'Panne réseau signalée',
        initiator_phone_number: '0102030405',
        processed_at: '2026-07-01T10:00:00Z',
        approved_at: null,
        finalized_at: null,
        rejected_at: null,
        confirmed_at: null,
        abandoned_at: null,
        acknowledged_at: null,
        reason: null,
        callback_type: null,
        status: 'pending',
        qualification_state: null,
        processing_state: null,
        finalization_state: null,
        state: 'pending',
        deny_count: 0,
        confirm_count: 2,
        acknowledged_comment: null,
        processed_comment: null,
        finalized_comment: null,
        approved_comment: null,
        rejected_comment: null,
        confirmed_comment: null,
        abandoned_comment: null,
        duplicate_of: null,
        is_duplicated: false,
        position: '',
        created_at: '2026-07-01T09:00:00Z',
        reported_at: '2026-07-01T08:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        region_id: 1,
        department_id: 2,
        municipality_code: 3,
        initiator: {
            id: 'USER-001',
            first_name: 'Awa',
            last_name: 'Traoré',
            phone: '0102030405',
            email: 'awa@example.com',
        },
        acknowledged_by: null,
        finalized_by: null,
        approved_by: null,
        rejected_by: null,
        processed_by: null,
        confirmed_by: null,
        abandoned_by: null,
        region: { id: 'REGION-001', name: 'Centre', code: 'CE' },
        department: { id: 'DEPT-001', name: 'Mfoundi', code: 'MF' },
        municipality: { id: 'MUN-001', name: 'Yaoundé I', code: 'YA1' },
        ...partial,
    };
}

function createMapper(): ReportStatesDetailsMapper {
    const injector = createEnvironmentInjector(
        [
            ActorMapper,
            ReportSourceMapper,
            ReportTypeMapper,
            LocationMethodMapper,
            LocationTypeMapper,
            LocationMapper,
            TelecomOperatorMapper,
            ReportMediaMapper,
            TreaterInfoMapper,
            AdministrativeBoundaryMapper,
            TimestampsMapper,
            ReportStatesDetailsMapper,
        ],
        null as never
    );
    return injector.get(ReportStatesDetailsMapper);
}

describe('ReportStatesDetailsMapper', () => {
    it('mappe le wire vers ReportStatesDetailsEntity — champs scalaires et délégations', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });

        expect(entity.uniqId).toBe('REQ-DETAILS-001');
        expect(entity.reportUniqId).toBe('REP-001');
        expect(entity.initiatorPhone).toBe('0102030405');
        expect(entity.source).toBe(ReportSource.APP);
        expect(entity.reportType).toBe(ReportType.ABI);
        expect(entity.operators).toEqual([TelecomOperator.MTN]);
        expect(entity.description).toBe('Panne réseau signalée');
        expect(entity.confirmCount).toBe(2);
    });

    it('délègue location à LocationMapper (coordonnées parsées, méthode/type transmis)', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });
        expect(entity.location.coordinates.latitude).toBe(3.86);
        expect(entity.location.coordinates.longitude).toBe(11.5);
        expect(entity.location.name).toBe('Yaoundé');
    });

    it('délègue region/department/municipality à AdministrativeBoundaryMapper', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });
        expect(entity.region).toEqual({
            id: 'REGION-001',
            name: 'Centre',
            code: 'CE',
        });
        expect(entity.department?.name).toBe('Mfoundi');
        expect(entity.municipality?.name).toBe('Yaoundé I');
    });

    it("region_id/department_id/municipality_code (numériques) sont ignorés — c'est region/department/municipality (objets) qui alimentent l'entité", () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({
                region_id: 999,
                region: { id: 'REGION-002', name: 'Littoral', code: 'LT' },
            }),
        });
        expect(entity.region?.id).toBe('REGION-002');
    });

    it('initiator mappé via ActorMapper ; acknowledged_by=null → acknowledgedBy non exposé mais sans exception', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });
        expect(entity.initiator?.id).toBe('USER-001');
        expect(entity.initiator?.firstName).toBe('Awa');
    });

    it('initiator=null → entity.initiator est null (pas une exception)', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ initiator: null }),
        });
        expect(entity.initiator).toBeNull();
    });

    it('délègue treater à TreaterInfoMapper (comment/deny_count/reason transmis)', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ reason: 'Doublon', deny_count: 3 }),
        });
        expect(entity.treater.reason).toBe('Doublon');
        expect(entity.treater.denyCount).toBe(3);
    });

    it.each([
        ['pending', ReportStatesDetailsStatus.PENDING],
        ['approved', ReportStatesDetailsStatus.APPROVED],
        ['rejected', ReportStatesDetailsStatus.REJECTED],
        ['abandoned', ReportStatesDetailsStatus.ABANDONED],
        ['in-progress', ReportStatesDetailsStatus.IN_PROGRESS],
        ['terminated', ReportStatesDetailsStatus.TERMINATED],
        ['confirmed', ReportStatesDetailsStatus.CONFIRMED],
    ] as const)('status wire %s → %s (STATUS_MAP)', (wire, expected) => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ status: wire }),
        });
        expect(entity.status).toBe(expected);
    });

    it('status wire inconnu retombe silencieusement sur PENDING (fallback ?? du STATUS_MAP, pas une exception)', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ status: 'archived' as never }),
        });
        expect(entity.status).toBe(ReportStatesDetailsStatus.PENDING);
    });

    it('qualification_state=null → null', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ qualification_state: null }),
        });
        expect(entity.qualificationState).toBeNull();
    });

    it("qualification_state='completed' → COMPLETED", () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ qualification_state: 'completed' }),
        });
        expect(entity.qualificationState).toBe(
            ReportStatesDetailsQualificationState.COMPLETED
        );
    });

    it('qualification_state wire truthy mais inconnu retombe silencieusement sur null (double fallback ?? imbriqué)', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ qualification_state: 'archived' as never }),
        });
        expect(entity.qualificationState).toBeNull();
    });

    it("operators: tableau vide si absent du wire (pas d'exception)", () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ operators: undefined as never }),
        });
        expect(entity.operators).toEqual([]);
    });

    it("reportUniqId/initiatorPhone/description valent '' quand absents du wire malgré le typage non-optionnel (défense ?? '')", () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({
                request_report_uniq_id: undefined as never,
                initiator_phone_number: undefined as never,
                description: undefined as never,
            }),
        });
        expect(entity.reportUniqId).toBe('');
        expect(entity.initiatorPhone).toBe('');
        expect(entity.description).toBe('');
    });

    it('lève une erreur si uniq_id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            createMapper().mapFromDto({
                error: false,
                message: '',
                data: makeItemDto({ uniq_id: undefined as never }),
            })
        ).toThrow('Missing required fields: uniq_id');
    });
});
