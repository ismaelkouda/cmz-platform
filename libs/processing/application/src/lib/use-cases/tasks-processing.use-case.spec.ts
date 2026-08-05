import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import type { PageResult } from '@cmz/shared-domain';
import {
    TasksProcessingEntity,
    TasksProcessingRepository,
} from '@cmz/processing-domain';
import {
    ReportSource,
    ReportType,
    TelecomOperator,
    TypeReport,
} from '@cmz/shared-domain';
import { TasksProcessingUseCase } from './tasks-processing.use-case';

function makeEntity(uniqId: string): TasksProcessingEntity {
    return new TasksProcessingEntity({
        type: TypeReport.PROCESSING,
        uniqId,
        reportType: ReportType.ABI,
        operators: [TelecomOperator.MTN],
        source: ReportSource.SMS,
        initiatorPhoneNumber: '690000000',
        reportedAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
    });
}

describe('TasksProcessingUseCase', () => {
    it('export delegates to repository with validated filter (sans page)', async () => {
        const items = [makeEntity('T-EXPORT')];
        const repo: TasksProcessingRepository = {
            execute: vi.fn(),
            export: vi.fn().mockReturnValue(of(items)),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: TasksProcessingRepository, useValue: repo },
                TasksProcessingUseCase,
            ],
            null as never
        );
        const useCase = injector.get(TasksProcessingUseCase);

        const result = await firstValueFrom(
            useCase.export({ uniqId: ' T-EXPORT ' }, { forceRefresh: true })
        );

        expect(repo.export).toHaveBeenCalledWith(
            expect.objectContaining({ uniqId: 'T-EXPORT' }),
            { forceRefresh: true }
        );
        expect(result).toHaveLength(1);
    });

    it('execute delegates with page', async () => {
        const pageResult: PageResult<TasksProcessingEntity> = {
            items: [makeEntity('T-001')],
            currentPage: 1,
            lastPage: 1,
            total: 1,
            perPage: 10,
        };
        const repo: TasksProcessingRepository = {
            execute: vi.fn().mockReturnValue(of(pageResult)),
            export: vi.fn(),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: TasksProcessingRepository, useValue: repo },
                TasksProcessingUseCase,
            ],
            null as never
        );
        const useCase = injector.get(TasksProcessingUseCase);

        await firstValueFrom(useCase.execute({}, '1'));

        expect(repo.execute).toHaveBeenCalledWith(
            expect.anything(),
            '1',
            undefined
        );
    });
});
