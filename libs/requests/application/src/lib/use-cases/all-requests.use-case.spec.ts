import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import type { PageResult } from '@cmz/shared-domain';
import { AllRequestsEntity, AllRequestsRepository } from '@cmz/requests-domain';
import {
    ReportSource,
    ReportType,
    TelecomOperator,
    TypeReport,
} from '@cmz/shared-domain';
import { AllRequestsUseCase } from './all-requests.use-case';

function makeEntity(uniqId: string): AllRequestsEntity {
    return new AllRequestsEntity({
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

describe('AllRequestsUseCase', () => {
    it('export delegates to repository with validated filter (sans page)', async () => {
        const items = [makeEntity('A-EXPORT')];
        const repo: AllRequestsRepository = {
            execute: vi.fn(),
            export: vi.fn().mockReturnValue(of(items)),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: AllRequestsRepository, useValue: repo },
                AllRequestsUseCase,
            ],
            null as never
        );
        const useCase = injector.get(AllRequestsUseCase);

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
        const pageResult: PageResult<AllRequestsEntity> = {
            items: [makeEntity('A-001')],
            currentPage: 1,
            lastPage: 1,
            total: 1,
            perPage: 10,
        };
        const repo: AllRequestsRepository = {
            execute: vi.fn().mockReturnValue(of(pageResult)),
            export: vi.fn(),
        };
        const injector = createEnvironmentInjector(
            [
                { provide: AllRequestsRepository, useValue: repo },
                AllRequestsUseCase,
            ],
            null as never
        );
        const useCase = injector.get(AllRequestsUseCase);

        await firstValueFrom(useCase.execute({}, '1'));

        expect(repo.execute).toHaveBeenCalledWith(
            expect.anything(),
            '1',
            undefined
        );
    });
});
