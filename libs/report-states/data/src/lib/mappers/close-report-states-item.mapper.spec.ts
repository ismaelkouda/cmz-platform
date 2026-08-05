import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it } from 'vitest';
import {
    PaginatedResponseDto,
    ReportSourceMapper,
    ReportTypeMapper,
    TelecomOperatorMapper,
} from '@cmz/shared-data';
import {
    ReportSource,
    ReportType,
    TelecomOperator,
    TypeReport,
} from '@cmz/shared-domain';
import { CloseReportStatesItemMapper } from './close-report-states-item.mapper';
import type { CloseReportStatesItemApiDto } from '../dtos/close-report-states-response-api.dto';

/**
 * Backlog #11 (cartographie, 2026-08-04) — module `report-states`, 2/6
 * fichiers. Même shape que `ApproveReportStatesItemMapper`, seul `type`
 * diverge (`PROCESSING`, volet « Demandes qualifiées »).
 */
function makePaginatedResponse(
    items: CloseReportStatesItemApiDto[]
): PaginatedResponseDto<CloseReportStatesItemApiDto> {
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
    partial: Partial<CloseReportStatesItemApiDto> = {}
): CloseReportStatesItemApiDto {
    return {
        uniq_id: 'REQ-002',
        report_type: ReportType.ZOB,
        operators: [TelecomOperator.ORANGE],
        source: ReportSource.PWA,
        initiator_phone_number: '0102030405',
        reported_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): CloseReportStatesItemMapper {
    const injector = createEnvironmentInjector(
        [
            ReportTypeMapper,
            TelecomOperatorMapper,
            ReportSourceMapper,
            CloseReportStatesItemMapper,
        ],
        null as never
    );
    return injector.get(CloseReportStatesItemMapper);
}

describe('CloseReportStatesItemMapper', () => {
    it('mappe le wire vers CloseReportStatesEntity, type = PROCESSING (volet Demandes qualifiées)', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.type).toBe(TypeReport.PROCESSING);
        expect(entity.uniqId).toBe('REQ-002');
        expect(entity.reportType).toBe(ReportType.ZOB);
        expect(entity.source).toBe(ReportSource.PWA);
    });

    it('lève ApiError.invalidResponse si source est une valeur wire inconnue', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([makeItemDto({ source: 'web' as never })])
            )
        ).toThrow(/ReportSource wire inconnue/);
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
