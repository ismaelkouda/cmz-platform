import '@angular/compiler';
import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it } from 'vitest';
import {
    PaginatedResponseDto,
    ReportSourceMapper,
    ReportTypeMapper,
    TelecomOperatorMapper,
} from '@cmz/shared-data';
import { ReportSource, ReportType, TelecomOperator, TypeReport } from '@cmz/shared-domain';
import { ApproveReportStatesItemMapper } from './approve-report-states-item.mapper';
import type { ApproveReportStatesItemApiDto } from '../dtos/approve-report-states-response-api.dto';

/**
 * Backlog #11 (cartographie, item découvert le 2026-08-04 lors du chantier
 * « mappers concrets ») — module `report-states` (famille `workflow-action`,
 * corpus-couvert structurellement, mais sans spec comportementale dédiée
 * pour ce fichier précis malgré un oracle corpus qui liste
 * `@cmz/report-states-data:test` comme passé — le test au niveau projet
 * passait déjà grâce à `report-states-details-mappers.spec.ts`, sans jamais
 * exercer CE mapper). 1/6 fichiers de ce backlog.
 */
function makePaginatedResponse(
    items: ApproveReportStatesItemApiDto[]
): PaginatedResponseDto<ApproveReportStatesItemApiDto> {
    return {
        error: false,
        message: 'OK',
        data: {
            current_page: 1,
            last_page: 1,
            per_page: 15,
            total: items.length,
            from: 1,
            to: items.length,
            first_page_url: '',
            last_page_url: '',
            next_page_url: '',
            prev_page_url: '',
            path: '',
            links: [],
            data: items,
        },
    };
}

function makeItemDto(
    partial: Partial<ApproveReportStatesItemApiDto> = {}
): ApproveReportStatesItemApiDto {
    return {
        uniq_id: 'REQ-001',
        report_type: ReportType.ABI,
        operators: [TelecomOperator.MTN],
        source: ReportSource.APP,
        initiator_phone_number: '0102030405',
        reported_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): ApproveReportStatesItemMapper {
    const injector = createEnvironmentInjector(
        [
            ReportTypeMapper,
            TelecomOperatorMapper,
            ReportSourceMapper,
            ApproveReportStatesItemMapper,
        ],
        null as never
    );
    return injector.get(ApproveReportStatesItemMapper);
}

describe('ApproveReportStatesItemMapper', () => {
    it('mappe le wire vers ApproveReportStatesEntity, type = REQUESTS (volet Files d’attente)', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.type).toBe(TypeReport.REQUESTS);
        expect(entity.uniqId).toBe('REQ-001');
        expect(entity.reportType).toBe(ReportType.ABI);
        expect(entity.operators).toEqual([TelecomOperator.MTN]);
        expect(entity.source).toBe(ReportSource.APP);
    });

    it('lève ApiError.invalidResponse si report_type est une valeur wire inconnue', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([
                    makeItemDto({ report_type: 'inconnu' as never }),
                ])
            )
        ).toThrow(/ReportType wire inconnue/);
    });

    it('lève ApiError.invalidResponse si un operator est une valeur wire inconnue', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([
                    makeItemDto({ operators: ['bouygues' as never] }),
                ])
            )
        ).toThrow(/TelecomOperator wire inconnue/);
    });

    it("operators: tableau vide si absent du wire (pas d'exception)", () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([
                makeItemDto({ operators: undefined as never }),
            ])
        ).items[0];
        expect(entity.operators).toEqual([]);
    });

    it('lève une erreur si uniq_id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([
                    makeItemDto({ uniq_id: undefined as never }),
                ])
            )
        ).toThrow('Missing required fields: uniq_id');
    });
});
