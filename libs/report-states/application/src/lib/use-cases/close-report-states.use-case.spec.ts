// Angular JIT compiler — requis pour les décorateurs Angular dans Vitest.
import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import type { PageResult } from '@cmz/shared-domain';
import {
    CloseReportStatesEntity,
    CloseReportStatesRepository,
} from '@cmz/report-states-domain';
import {
    ReportSource,
    ReportType,
    TelecomOperator,
    TypeReport,
} from '@cmz/shared-domain';
import { CloseReportStatesUseCase } from './close-report-states.use-case';

function makeEntity(uniqId: string): CloseReportStatesEntity {
    return new CloseReportStatesEntity({
        type: TypeReport.REQUESTS,
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
    items: CloseReportStatesEntity[]
): PageResult<CloseReportStatesEntity> {
    return {
        items,
        currentPage: 1,
        lastPage: 1,
        total: items.length,
        perPage: 10,
    };
}

describe('CloseReportStatesUseCase', () => {
    it('delegates to CloseReportStatesRepository with validated filter and page', async () => {
        const pageResult = makePageResult([makeEntity('Q-001')]);
        const repo: CloseReportStatesRepository = {
            execute: vi.fn().mockReturnValue(of(pageResult)),
            export: vi.fn(),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: CloseReportStatesRepository, useValue: repo },
                CloseReportStatesUseCase,
            ],
            null as never
        );
        const useCase = injector.get(CloseReportStatesUseCase);

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
        const repo: CloseReportStatesRepository = {
            execute: vi
                .fn()
                .mockReturnValue(throwError(() => new Error('Network error'))),
            export: vi.fn(),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: CloseReportStatesRepository, useValue: repo },
                CloseReportStatesUseCase,
            ],
            null as never
        );
        const useCase = injector.get(CloseReportStatesUseCase);

        await expect(firstValueFrom(useCase.execute({}, '1'))).rejects.toThrow(
            'Network error'
        );
    });

    it('export delegates to repository with validated filter (sans page)', async () => {
        const items = [makeEntity('Q-EXPORT')];
        const repo: CloseReportStatesRepository = {
            execute: vi.fn(),
            export: vi.fn().mockReturnValue(of(items)),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: CloseReportStatesRepository, useValue: repo },
                CloseReportStatesUseCase,
            ],
            null as never
        );
        const useCase = injector.get(CloseReportStatesUseCase);

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
