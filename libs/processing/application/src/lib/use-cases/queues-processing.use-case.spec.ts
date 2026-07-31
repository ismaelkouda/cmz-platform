// Angular JIT compiler — requis pour les décorateurs Angular dans Vitest.
import '@angular/compiler';
import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import type { PageResult } from '@cmz/shared-domain';
import {
    QueuesProcessingEntity,
    QueuesProcessingRepository,
} from '@cmz/processing-domain';
import {
    ReportSource,
    ReportType,
    TelecomOperator,
    TypeReport,
} from '@cmz/shared-domain';
import { QueuesProcessingUseCase } from './queues-processing.use-case';

function makeEntity(uniqId: string): QueuesProcessingEntity {
    return new QueuesProcessingEntity({
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

function makePageResult(
    items: QueuesProcessingEntity[]
): PageResult<QueuesProcessingEntity> {
    return {
        items,
        currentPage: 1,
        lastPage: 1,
        total: items.length,
        perPage: 10,
    };
}

describe('QueuesProcessingUseCase', () => {
    it('delegates to QueuesProcessingRepository with validated filter and page', async () => {
        const pageResult = makePageResult([makeEntity('Q-001')]);
        const repo: QueuesProcessingRepository = {
            execute: vi.fn().mockReturnValue(of(pageResult)),
            export: vi.fn(),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: QueuesProcessingRepository, useValue: repo },
                QueuesProcessingUseCase,
            ],
            null as never
        );
        const useCase = injector.get(QueuesProcessingUseCase);

        const result = await firstValueFrom(
            useCase.execute({ uniqId: ' Q-001 ' }, '2', { forceRefresh: true })
        );

        expect(repo.execute).toHaveBeenCalledWith(
            expect.objectContaining({ uniqId: 'Q-001' }),
            '2',
            { forceRefresh: true }
        );
        expect(result.items).toHaveLength(1);
    });

    it('propagates repository errors via defer', async () => {
        const repo: QueuesProcessingRepository = {
            execute: vi
                .fn()
                .mockReturnValue(throwError(() => new Error('Network error'))),
            export: vi.fn(),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: QueuesProcessingRepository, useValue: repo },
                QueuesProcessingUseCase,
            ],
            null as never
        );
        const useCase = injector.get(QueuesProcessingUseCase);

        await expect(firstValueFrom(useCase.execute({}, '1'))).rejects.toThrow(
            'Network error'
        );
    });

    it('export delegates to repository with validated filter (sans page)', async () => {
        const items = [makeEntity('Q-EXPORT')];
        const repo: QueuesProcessingRepository = {
            execute: vi.fn(),
            export: vi.fn().mockReturnValue(of(items)),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: QueuesProcessingRepository, useValue: repo },
                QueuesProcessingUseCase,
            ],
            null as never
        );
        const useCase = injector.get(QueuesProcessingUseCase);

        const result = await firstValueFrom(
            useCase.export({ uniqId: ' Q-EXPORT ' }, { forceRefresh: true })
        );

        expect(repo.export).toHaveBeenCalledWith(
            expect.objectContaining({ uniqId: 'Q-EXPORT' }),
            { forceRefresh: true }
        );
        expect(result).toHaveLength(1);
        expect(result[0].uniqId).toBe('Q-EXPORT');
    });
});
