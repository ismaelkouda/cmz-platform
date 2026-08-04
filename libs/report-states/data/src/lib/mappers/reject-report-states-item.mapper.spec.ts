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
import { RejectReportStatesItemMapper } from './reject-report-states-item.mapper';
import type { RejectReportStatesItemApiDto } from '../dtos/reject-report-states-response-api.dto';

/**
 * Backlog #11 (cartographie, 2026-08-04) — module `report-states`, 4/6
 * fichiers (module complet pour les 4 mappers-item de la famille
 * approve/close/evaluate/reject). Même shape que
 * `ApproveReportStatesItemMapper`, `type` = `REQUESTS` (volet « Files
 * d'attente », comme `approve` — les deux partagent le même volet
 * source, contrairement à `close`/`evaluate` qui partagent `PROCESSING`).
 */
function makePaginatedResponse(
    items: RejectReportStatesItemApiDto[]
): PaginatedResponseDto<RejectReportStatesItemApiDto> {
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
    partial: Partial<RejectReportStatesItemApiDto> = {}
): RejectReportStatesItemApiDto {
    return {
        uniq_id: 'REQ-004',
        report_type: ReportType.CPO,
        operators: [TelecomOperator.MTN, TelecomOperator.ORANGE],
        source: ReportSource.IVR,
        initiator_phone_number: '0102030405',
        reported_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): RejectReportStatesItemMapper {
    const injector = createEnvironmentInjector(
        [
            ReportTypeMapper,
            TelecomOperatorMapper,
            ReportSourceMapper,
            RejectReportStatesItemMapper,
        ],
        null as never
    );
    return injector.get(RejectReportStatesItemMapper);
}

describe('RejectReportStatesItemMapper', () => {
    it('mappe le wire vers RejectReportStatesEntity, type = REQUESTS (volet Files d’attente), operators multiples', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.type).toBe(TypeReport.REQUESTS);
        expect(entity.uniqId).toBe('REQ-004');
        expect(entity.operators).toEqual([TelecomOperator.MTN, TelecomOperator.ORANGE]);
        expect(entity.source).toBe(ReportSource.IVR);
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
