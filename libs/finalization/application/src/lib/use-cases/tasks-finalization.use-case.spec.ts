import '@angular/compiler';
import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import type { PageResult } from '@cmz/shared-domain';
import {
    TasksFinalizationEntity,
    TasksFinalizationRepository,
} from '@cmz/finalization-domain';
import {
    ReportSource,
    ReportType,
    TelecomOperator,
    TypeReport,
} from '@cmz/shared-domain';
import { TasksFinalizationUseCase } from './tasks-finalization.use-case';

function makeEntity(uniqId: string): TasksFinalizationEntity {
    return new TasksFinalizationEntity({
        type: TypeReport.FINALIZATION,
        uniqId,
        reportType: ReportType.ABI,
        operators: [TelecomOperator.MTN],
        source: ReportSource.SMS,
        initiatorPhoneNumber: '690000000',
        reportedAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
    });
}

describe('TasksFinalizationUseCase', () => {
    it('export delegates to repository with validated filter (sans page)', async () => {
        const items = [makeEntity('T-EXPORT')];
        const repo: TasksFinalizationRepository = {
            execute: vi.fn(),
            export: vi.fn().mockReturnValue(of(items)),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: TasksFinalizationRepository, useValue: repo },
                TasksFinalizationUseCase,
            ],
            null as never
        );
        const useCase = injector.get(TasksFinalizationUseCase);

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
        const pageResult: PageResult<TasksFinalizationEntity> = {
            items: [makeEntity('T-001')],
            currentPage: 1,
            lastPage: 1,
            total: 1,
            perPage: 10,
        };
        const repo: TasksFinalizationRepository = {
            execute: vi.fn().mockReturnValue(of(pageResult)),
            export: vi.fn(),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: TasksFinalizationRepository, useValue: repo },
                TasksFinalizationUseCase,
            ],
            null as never
        );
        const useCase = injector.get(TasksFinalizationUseCase);

        await firstValueFrom(useCase.execute({}, '1'));

        expect(repo.execute).toHaveBeenCalledWith(
            expect.anything(),
            '1',
            undefined
        );
    });
});
