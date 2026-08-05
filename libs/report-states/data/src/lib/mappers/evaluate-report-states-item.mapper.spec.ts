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
import { EvaluateReportStatesItemMapper } from './evaluate-report-states-item.mapper';
import type { EvaluateReportStatesItemApiDto } from '../dtos/evaluate-report-states-response-api.dto';

/**
 * Backlog #11 (cartographie, 2026-08-04) — module `report-states`, 3/6
 * fichiers. Même shape que `ApproveReportStatesItemMapper`, `type` =
 * `PROCESSING` (volet « Tâches »).
 */
function makePaginatedResponse(
    items: EvaluateReportStatesItemApiDto[]
): PaginatedResponseDto<EvaluateReportStatesItemApiDto> {
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
    partial: Partial<EvaluateReportStatesItemApiDto> = {}
): EvaluateReportStatesItemApiDto {
    return {
        uniq_id: 'REQ-003',
        report_type: ReportType.CPS,
        operators: [TelecomOperator.MOOV],
        source: ReportSource.USSD,
        initiator_phone_number: '0102030405',
        reported_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): EvaluateReportStatesItemMapper {
    const injector = createEnvironmentInjector(
        [
            ReportTypeMapper,
            TelecomOperatorMapper,
            ReportSourceMapper,
            EvaluateReportStatesItemMapper,
        ],
        null as never
    );
    return injector.get(EvaluateReportStatesItemMapper);
}

describe('EvaluateReportStatesItemMapper', () => {
    it('mappe le wire vers EvaluateReportStatesEntity, type = PROCESSING (volet Tâches)', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.type).toBe(TypeReport.PROCESSING);
        expect(entity.uniqId).toBe('REQ-003');
        expect(entity.reportType).toBe(ReportType.CPS);
        expect(entity.source).toBe(ReportSource.USSD);
    });

    it("initiatorPhoneNumber/reportedAt valent '' quand absents du wire malgré le typage non-optionnel (défense ?? '')", () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([
                makeItemDto({
                    initiator_phone_number: undefined as never,
                    reported_at: undefined as never,
                }),
            ])
        ).items[0];
        expect(entity.initiatorPhoneNumber).toBe('');
        expect(entity.reportedAt).toBe('');
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
