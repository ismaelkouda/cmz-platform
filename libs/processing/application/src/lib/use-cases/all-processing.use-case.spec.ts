import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import type { PageResult } from '@cmz/shared-domain';
import {
    AllProcessingEntity,
    AllProcessingRepository,
} from '@cmz/processing-domain';
import {
    ReportSource,
    ReportType,
    TelecomOperator,
    TypeReport,
} from '@cmz/shared-domain';
import { AllProcessingUseCase } from './all-processing.use-case';

function makeEntity(uniqId: string): AllProcessingEntity {
    return new AllProcessingEntity({
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

describe('AllProcessingUseCase', () => {
    it('export delegates to repository with validated filter (sans page)', async () => {
        const items = [makeEntity('A-EXPORT')];
        const repo: AllProcessingRepository = {
            execute: vi.fn(),
            export: vi.fn().mockReturnValue(of(items)),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: AllProcessingRepository, useValue: repo },
                AllProcessingUseCase,
            ],
            null as never
        );
        const useCase = injector.get(AllProcessingUseCase);

        const result = await firstValueFrom(
            useCase.export({ uniqId: ' A-EXPORT ' }, { forceRefresh: true })
        );

        expect(repo.export).toHaveBeenCalledWith(
            expect.objectContaining({ uniqId: 'A-EXPORT' }),
            { forceRefresh: true }
        );
        expect(result).toHaveLength(1);
    });

    it('execute delegates with page', async () => {
        const pageResult: PageResult<AllProcessingEntity> = {
            items: [makeEntity('A-001')],
            currentPage: 1,
            lastPage: 1,
            total: 1,
            perPage: 10,
        };
        const repo: AllProcessingRepository = {
            execute: vi.fn().mockReturnValue(of(pageResult)),
            export: vi.fn(),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: AllProcessingRepository, useValue: repo },
                AllProcessingUseCase,
            ],
            null as never
        );
        const useCase = injector.get(AllProcessingUseCase);

        await firstValueFrom(useCase.execute({}, '1'));

        expect(repo.execute).toHaveBeenCalledWith(
            expect.anything(),
            '1',
            undefined
        );
    });
});
