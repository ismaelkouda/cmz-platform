import '@angular/compiler';
import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import type { PageResult } from '@cmz/shared-domain';
import {
    TasksActionsConformity,
    TasksActionsEntity,
    TasksActionsRepository,
} from '@cmz/processing-domain';
import { TelecomOperator } from '@cmz/shared-domain';
import { TasksActionsUseCase } from './tasks-actions.use-case';

function makeEntity(id: string): TasksActionsEntity {
    return new TasksActionsEntity({
        uniqId: id,
        date: new Date('2026-01-01T00:00:00Z'),
        type: 'Inspection',
        code: 'INSP',
        operators: [TelecomOperator.MTN],
        description: 'Action test',
        shouldNotifyUser: false,
        autoChecked: false,
        isConform: TasksActionsConformity.CONFORM,
        createdBy: 'Agent Test',
        updatedBy: 'Agent Test',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
    });
}

describe('TasksActionsUseCase', () => {
    it('délègue execute au repository avec filtre validé', async () => {
        const pageResult: PageResult<TasksActionsEntity> = {
            items: [makeEntity('ACT-001')],
            currentPage: 1,
            lastPage: 1,
            total: 1,
            perPage: 10,
        };
        const repo: TasksActionsRepository = {
            execute: vi.fn().mockReturnValue(of(pageResult)),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: TasksActionsRepository, useValue: repo },
                TasksActionsUseCase,
            ],
            null as never
        );
        const useCase = injector.get(TasksActionsUseCase);

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
        const repo: TasksActionsRepository = {
            execute: vi.fn(),
            create: vi
                .fn()
                .mockReturnValue(of({ message: 'OK', error: false })),
            update: vi.fn(),
            delete: vi.fn(),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: TasksActionsRepository, useValue: repo },
                TasksActionsUseCase,
            ],
            null as never
        );
        const useCase = injector.get(TasksActionsUseCase);

        await firstValueFrom(
            useCase.create({
                reportUniqId: 'REP-001',
                date: new Date('2026-01-01'),
                type: 'INSP',
                operator: TelecomOperator.MTN,
                description: 'Desc',
                shouldNotifyUser: false,
                isConform: TasksActionsConformity.CONFORM,
            })
        );

        expect(repo.create).toHaveBeenCalled();
    });

    it('propage les erreurs repository via defer', async () => {
        const repo: TasksActionsRepository = {
            execute: vi
                .fn()
                .mockReturnValue(throwError(() => new Error('Network error'))),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: TasksActionsRepository, useValue: repo },
                TasksActionsUseCase,
            ],
            null as never
        );
        const useCase = injector.get(TasksActionsUseCase);

        await expect(
            firstValueFrom(useCase.execute({ reportUniqId: 'REP-001' }, '1'))
        ).rejects.toThrow('Network error');
    });
});
