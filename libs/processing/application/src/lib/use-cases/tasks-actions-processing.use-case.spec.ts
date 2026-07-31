import '@angular/compiler';
import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import type { PageResult } from '@cmz/shared-domain';
import {
    TasksActionsProcessingConformity,
    TasksActionsProcessingEntity,
    TasksActionsProcessingRepository,
} from '@cmz/processing-domain';
import { TelecomOperator } from '@cmz/shared-domain';
import { TasksActionsProcessingUseCase } from './tasks-actions-processing.use-case';

function makeEntity(id: string): TasksActionsProcessingEntity {
    return new TasksActionsProcessingEntity({
        uniqId: id,
        date: new Date('2026-01-01T00:00:00Z'),
        type: 'Inspection',
        code: 'INSP',
        operators: [TelecomOperator.MTN],
        description: 'Action test',
        shouldNotifyUser: false,
        autoChecked: false,
        isConform: TasksActionsProcessingConformity.CONFORM,
        createdBy: 'Agent Test',
        updatedBy: 'Agent Test',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
    });
}

describe('TasksActionsProcessingUseCase', () => {
    it('délègue execute au repository avec filtre validé', async () => {
        const pageResult: PageResult<TasksActionsProcessingEntity> = {
            items: [makeEntity('ACT-001')],
            currentPage: 1,
            lastPage: 1,
            total: 1,
            perPage: 10,
        };
        const repo: TasksActionsProcessingRepository = {
            execute: vi.fn().mockReturnValue(of(pageResult)),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: TasksActionsProcessingRepository, useValue: repo },
                TasksActionsProcessingUseCase,
            ],
            null as never
        );
        const useCase = injector.get(TasksActionsProcessingUseCase);

        const result = await firstValueFrom(
            useCase.execute({ reportUniqId: 'REP-001' }, '1')
        );

        expect(repo.execute).toHaveBeenCalledWith(
            expect.objectContaining({ reportUniqId: 'REP-001' }),
            '1',
            undefined
        );
        expect(result.items).toHaveLength(1);
    });

    it('délègue create au repository', async () => {
        const repo: TasksActionsProcessingRepository = {
            execute: vi.fn(),
            create: vi
                .fn()
                .mockReturnValue(of({ message: 'OK', error: false })),
            update: vi.fn(),
            delete: vi.fn(),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: TasksActionsProcessingRepository, useValue: repo },
                TasksActionsProcessingUseCase,
            ],
            null as never
        );
        const useCase = injector.get(TasksActionsProcessingUseCase);

        await firstValueFrom(
            useCase.create({
                reportUniqId: 'REP-001',
                date: new Date('2026-01-01'),
                type: 'INSP',
                operator: TelecomOperator.MTN,
                description: 'Desc',
                shouldNotifyUser: false,
                isConform: TasksActionsProcessingConformity.CONFORM,
            })
        );

        expect(repo.create).toHaveBeenCalled();
    });

    it('propage les erreurs repository via defer', async () => {
        const repo: TasksActionsProcessingRepository = {
            execute: vi
                .fn()
                .mockReturnValue(throwError(() => new Error('Network error'))),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: TasksActionsProcessingRepository, useValue: repo },
                TasksActionsProcessingUseCase,
            ],
            null as never
        );
        const useCase = injector.get(TasksActionsProcessingUseCase);

        await expect(
            firstValueFrom(useCase.execute({ reportUniqId: 'REP-001' }, '1'))
        ).rejects.toThrow('Network error');
    });
});
