// Angular JIT compiler — requis pour les décorateurs Angular dans Vitest.
import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import type { PageResult } from '@cmz/shared-domain';
import {
    DownloadReportStatesEntity,
    DownloadReportStatesRepository,
    DownloadReportStatesStatus,
    DownloadReportStatesType,
} from '@cmz/report-states-domain';
import { DownloadReportStatesUseCase } from './download-report-states.use-case';

function makeEntity(uniqId: string): DownloadReportStatesEntity {
    return new DownloadReportStatesEntity({
        uniqId,
        url: 'https://cdn.example.com/export.xlsx',
        name: 'export.xlsx',
        size: 2048,
        type: DownloadReportStatesType.EXCEL,
        status: DownloadReportStatesStatus.DONE,
        filters: [],
        createdAt: '2026-01-01T00:00:00Z',
    });
}

function makePageResult(
    items: DownloadReportStatesEntity[]
): PageResult<DownloadReportStatesEntity> {
    return {
        items,
        currentPage: 1,
        lastPage: 1,
        total: items.length,
        perPage: 10,
    };
}

describe('DownloadReportStatesUseCase', () => {
    it('delegates to DownloadReportStatesRepository with validated filter and page', async () => {
        const pageResult = makePageResult([makeEntity('Q-001')]);
        const repo: DownloadReportStatesRepository = {
            execute: vi.fn().mockReturnValue(of(pageResult)),
            export: vi.fn(),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: DownloadReportStatesRepository, useValue: repo },
                DownloadReportStatesUseCase,
            ],
            null as never
        );
        const useCase = injector.get(DownloadReportStatesUseCase);

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
        const repo: DownloadReportStatesRepository = {
            execute: vi
                .fn()
                .mockReturnValue(throwError(() => new Error('Network error'))),
            export: vi.fn(),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: DownloadReportStatesRepository, useValue: repo },
                DownloadReportStatesUseCase,
            ],
            null as never
        );
        const useCase = injector.get(DownloadReportStatesUseCase);

        await expect(firstValueFrom(useCase.execute({}, '1'))).rejects.toThrow(
            'Network error'
        );
    });

    it('export delegates to repository with validated filter (sans page)', async () => {
        const items = [makeEntity('Q-EXPORT')];
        const repo: DownloadReportStatesRepository = {
            execute: vi.fn(),
            export: vi.fn().mockReturnValue(of(items)),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: DownloadReportStatesRepository, useValue: repo },
                DownloadReportStatesUseCase,
            ],
            null as never
        );
        const useCase = injector.get(DownloadReportStatesUseCase);

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
