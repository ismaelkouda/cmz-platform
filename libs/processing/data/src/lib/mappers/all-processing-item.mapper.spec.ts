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
import { AllProcessingItemMapper } from './all-processing-item.mapper';
import type { AllProcessingItemApiDto } from '../dtos/all-processing-response-api.dto';

function makePaginatedResponse(
    items: AllProcessingItemApiDto[]
): PaginatedResponseDto<AllProcessingItemApiDto> {
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
    partial: Partial<AllProcessingItemApiDto> = {}
): AllProcessingItemApiDto {
    return {
        uniq_id: 'PROC-A-001',
        report_type: ReportTypeDto.CPO,
        operators: [TelecomOperatorDto.MTN, TelecomOperatorDto.MOOV],
        source: ReportSourceDto.APP,
        initiator_phone_number: '690000003',
        reported_at: '2026-07-05T10:00:00Z',
        updated_at: '2026-07-06T10:00:00Z',
        ...partial,
    };
}

function createMapper(): AllProcessingItemMapper {
    const injector = createEnvironmentInjector(
        [
            ReportTypeMapper,
            TelecomOperatorMapper,
            ReportSourceMapper,
            AllProcessingItemMapper,
        ],
        null as never
    );
    return injector.get(AllProcessingItemMapper);
}

describe('AllProcessingItemMapper', () => {
    const mapper = createMapper();

    it('mappe le wire vers AllProcessingEntity', () => {
        const result = mapper.mapFromDto(
            makePaginatedResponse([makeItemDto()])
        );
        const entity = result.items[0];

        expect(entity.uniqId).toBe('PROC-A-001');
        expect(entity.type).toBe(TypeReport.PROCESSING);
        expect(entity.reportType).toBe(ReportType.CPO);
        expect(entity.operators).toEqual([
            TelecomOperator.MTN,
            TelecomOperator.MOOV,
        ]);
        expect(entity.source).toBe(ReportSource.APP);
        expect(entity.initiatorPhoneNumber).toBe('690000003');
        expect(entity.reportedAt).toBe('2026-07-05T10:00:00Z');
        expect(entity.updatedAt).toBe('2026-07-06T10:00:00Z');
    });

    it('default les champs optionnels wire à une chaîne vide', () => {
        const result = mapper.mapFromDto(
            makePaginatedResponse([
                makeItemDto({
                    initiator_phone_number: undefined,
                    reported_at: undefined,
                    updated_at: undefined,
                }),
            ])
        );
        const entity = result.items[0];

        expect(entity.initiatorPhoneNumber).toBe('');
        expect(entity.reportedAt).toBe('');
        expect(entity.updatedAt).toBe('');
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
