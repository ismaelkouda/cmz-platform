// Angular JIT compiler — requis quand les tests importent des modules Angular
// partiellement compilés (ex: @angular/common via @cmz/shared-data).
import '@angular/compiler';
import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it } from 'vitest';
import {
    ReportSourceDto,
    ReportTypeDto,
    PaginatedResponseDto,
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
import { QueuesFinalizationItemMapper } from './queues-finalization-item.mapper';
import type { QueuesFinalizationItemApiDto } from '../dtos/queues-finalization-response-api.dto';

function makePaginatedResponse(
    items: QueuesFinalizationItemApiDto[]
): PaginatedResponseDto<QueuesFinalizationItemApiDto> {
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
    partial: Partial<QueuesFinalizationItemApiDto> = {}
): QueuesFinalizationItemApiDto {
    return {
        uniq_id: 'PROC-001',
        report_type: ReportTypeDto.ABI,
        operators: [TelecomOperatorDto.MTN],
        source: ReportSourceDto.SMS,
        initiator_phone_number: '690000001',
        reported_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): QueuesFinalizationItemMapper {
    const injector = createEnvironmentInjector(
        [
            ReportTypeMapper,
            TelecomOperatorMapper,
            ReportSourceMapper,
            QueuesFinalizationItemMapper,
        ],
        null as never
    );
    return injector.get(QueuesFinalizationItemMapper);
}

describe('QueuesFinalizationItemMapper', () => {
    const mapper = createMapper();

    it('mappe le wire vers QueuesFinalizationEntity', () => {
        const result = mapper.mapFromDto(
            makePaginatedResponse([makeItemDto()])
        );
        const entity = result.items[0];

        expect(entity.uniqId).toBe('PROC-001');
        expect(entity.type).toBe(TypeReport.FINALIZATION);
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
