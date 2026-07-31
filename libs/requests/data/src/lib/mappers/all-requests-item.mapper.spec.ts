// Angular JIT compiler — requis quand les tests importent des modules Angular
// partiellement compilés (ex: @angular/common via @cmz/shared-data).
import '@angular/compiler';
import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it } from 'vitest';
import {
    ReportSourceMapper,
    ReportTypeMapper,
    TelecomOperatorDto,
    TelecomOperatorMapper,
} from '@cmz/shared-data';
import {
    ReportSource,
    ReportType,
    TelecomOperator,
    TypeReport,
} from '@cmz/shared-domain';
import { AllRequestsItemMapper } from './all-requests-item.mapper';
import type { AllRequestsItemApiDto } from '../dtos/all-requests-response-api.dto';

function makePaginatedResponse(items: AllRequestsItemApiDto[]) {
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
            next_page_url: null,
            prev_page_url: null,
            path: '',
            links: [],
            data: items,
        },
    };
}

function makeItemDto(
    partial: Partial<AllRequestsItemApiDto> = {}
): AllRequestsItemApiDto {
    return {
        uniq_id: 'ALL-001',
        report_type: ReportType.ABI,
        operators: [TelecomOperatorDto.MTN],
        source: ReportSource.SMS,
        initiator_phone_number: '690000001',
        reported_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): AllRequestsItemMapper {
    const injector = createEnvironmentInjector(
        [
            ReportTypeMapper,
            TelecomOperatorMapper,
            ReportSourceMapper,
            AllRequestsItemMapper,
        ],
        null as never
    );
    return injector.get(AllRequestsItemMapper);
}

describe('AllRequestsItemMapper', () => {
    const mapper = createMapper();

    it('mappe le wire vers AllRequestsEntity', () => {
        const result = mapper.mapFromDto(
            makePaginatedResponse([makeItemDto()])
        );
        const entity = result.items[0];

        expect(entity.uniqId).toBe('ALL-001');
        expect(entity.type).toBe(TypeReport.REQUESTS);
        expect(entity.reportType).toBe(ReportType.ABI);
        expect(entity.operators).toEqual([TelecomOperator.MTN]);
        expect(entity.source).toBe(ReportSource.SMS);
    });

    it('lève une erreur si uniq_id est absent', () => {
        expect(() =>
            mapper.mapFromDto(
                makePaginatedResponse([
                    makeItemDto({ uniq_id: undefined as never }),
                ])
            )
        ).toThrow('Missing required fields: uniq_id');
    });
});
