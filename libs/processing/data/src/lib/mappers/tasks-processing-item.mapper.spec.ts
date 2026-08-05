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
import { TasksProcessingItemMapper } from './tasks-processing-item.mapper';
import type { TasksProcessingItemApiDto } from '../dtos/tasks-processing-response-api.dto';

function makePaginatedResponse(
    items: TasksProcessingItemApiDto[]
): PaginatedResponseDto<TasksProcessingItemApiDto> {
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
    partial: Partial<TasksProcessingItemApiDto> = {}
): TasksProcessingItemApiDto {
    return {
        uniq_id: 'PROC-T-001',
        report_type: ReportTypeDto.ZOB,
        operators: [TelecomOperatorDto.ORANGE],
        source: ReportSourceDto.IVR,
        initiator_phone_number: '690000002',
        reported_at: '2026-07-03T10:00:00Z',
        updated_at: '2026-07-04T10:00:00Z',
        ...partial,
    };
}

function createMapper(): TasksProcessingItemMapper {
    const injector = createEnvironmentInjector(
        [
            ReportTypeMapper,
            TelecomOperatorMapper,
            ReportSourceMapper,
            TasksProcessingItemMapper,
        ],
        null as never
    );
    return injector.get(TasksProcessingItemMapper);
}

describe('TasksProcessingItemMapper', () => {
    const mapper = createMapper();

    it('mappe le wire vers TasksProcessingEntity', () => {
        const result = mapper.mapFromDto(
            makePaginatedResponse([makeItemDto()])
        );
        const entity = result.items[0];

        expect(entity.uniqId).toBe('PROC-T-001');
        expect(entity.type).toBe(TypeReport.PROCESSING);
        expect(entity.reportType).toBe(ReportType.ZOB);
        expect(entity.operators).toEqual([TelecomOperator.ORANGE]);
        expect(entity.source).toBe(ReportSource.IVR);
        expect(entity.initiatorPhoneNumber).toBe('690000002');
        expect(entity.reportedAt).toBe('2026-07-03T10:00:00Z');
        expect(entity.updatedAt).toBe('2026-07-04T10:00:00Z');
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
