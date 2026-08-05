// Angular JIT compiler — requis quand les tests importent des modules Angular
// partiellement compilés (ex: @angular/common via @cmz/shared-data).
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
import { TasksFinalizationItemMapper } from './tasks-finalization-item.mapper';
import type { TasksFinalizationItemApiDto } from '../dtos/tasks-finalization-response-api.dto';

function makePaginatedResponse(
    items: TasksFinalizationItemApiDto[]
): PaginatedResponseDto<TasksFinalizationItemApiDto> {
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
    partial: Partial<TasksFinalizationItemApiDto> = {}
): TasksFinalizationItemApiDto {
    return {
        uniq_id: 'TASK-001',
        report_type: ReportTypeDto.ABI,
        operators: [TelecomOperatorDto.MTN],
        source: ReportSourceDto.SMS,
        initiator_phone_number: '690000001',
        reported_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): TasksFinalizationItemMapper {
    const injector = createEnvironmentInjector(
        [
            ReportTypeMapper,
            TelecomOperatorMapper,
            ReportSourceMapper,
            TasksFinalizationItemMapper,
        ],
        null as never
    );
    return injector.get(TasksFinalizationItemMapper);
}

describe('TasksFinalizationItemMapper', () => {
    const mapper = createMapper();

    it('mappe le wire vers TasksFinalizationEntity', () => {
        const result = mapper.mapFromDto(
            makePaginatedResponse([makeItemDto()])
        );
        const entity = result.items[0];

        expect(entity.uniqId).toBe('TASK-001');
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
