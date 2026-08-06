// Angular JIT compiler — requis pour les décorateurs Angular dans Vitest.
import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import {
    ProcessingDetailsEntity,
    ProcessingDetailsProcessingState,
    ProcessingDetailsRepository,
} from '@cmz/processing-domain';
import type { ProcessingDetailsProps } from '@cmz/processing-domain';
import { ProcessingDetailsUseCase } from './processing-details.use-case';

function makeDetails(uniqId = 'PROC-001'): ProcessingDetailsEntity {
    const props = {
        uniqId,
        reportType: 'ABI',
        operators: ['MTN'],
        description: 'Description',
        processingState: ProcessingDetailsProcessingState.IN_PROGRESS,
        location: {
            coordinates: { latitude: 3.86, longitude: 11.5, what3words: '' },
            name: 'residence_place',
            description: '',
            method: 'gps',
            type: 'point',
        },
        media: null,
    } as unknown as ProcessingDetailsProps;

    return new ProcessingDetailsEntity(props, {
        canTake: true,
        canTreat: true,
    });
}

function createUseCase(
    repo: ProcessingDetailsRepository
): ProcessingDetailsUseCase {
    const injector = createEnvironmentInjector(
        [
            { provide: ProcessingDetailsRepository, useValue: repo },
            ProcessingDetailsUseCase,
        ],
        null as never
    );
    return injector.get(ProcessingDetailsUseCase);
}

describe('ProcessingDetailsUseCase', () => {
    it('charge la fiche avec filtre validé et permissions appliquées', async () => {
        const details = makeDetails();
        const repo: ProcessingDetailsRepository = {
            execute: vi.fn().mockReturnValue(of(details)),
            take: vi.fn(),
            treat: vi.fn(),
        };
        const useCase = createUseCase(repo);

        const result = await firstValueFrom(
            useCase.execute({
                filter: { uniqId: ' PROC-001 ' },
                permissions: { canTake: false, canTreat: true },
            })
        );

        expect(repo.execute).toHaveBeenCalledWith(
            expect.objectContaining({ uniqId: 'PROC-001' }),
            undefined
        );
        expect(result.canTreat).toBe(true);
        expect(result.canTake).toBe(false);
    });

    it('délègue take au repository', async () => {
        const repo: ProcessingDetailsRepository = {
            execute: vi.fn(),
            take: vi.fn().mockReturnValue(of(undefined)),
            treat: vi.fn(),
        };
        const useCase = createUseCase(repo);

        await firstValueFrom(useCase.take({ uniqId: ' PROC-002 ' }));

        expect(repo.take).toHaveBeenCalledWith(
            expect.objectContaining({ uniqId: 'PROC-002' })
        );
    });

    it('délègue treat au repository via fromContract', async () => {
        const repo: ProcessingDetailsRepository = {
            execute: vi.fn(),
            take: vi.fn(),
            treat: vi.fn().mockReturnValue(of(undefined)),
        };
        const useCase = createUseCase(repo);

        await firstValueFrom(
            useCase.treat({
                uniqId: ' PROC-003 ',
                comment: 'OK',
            })
        );

        expect(repo.treat).toHaveBeenCalledWith(
            expect.objectContaining({
                uniqId: 'PROC-003',
                comment: 'OK',
            })
        );
    });

    it('propage les erreurs repository via defer', async () => {
        const repo: ProcessingDetailsRepository = {
            execute: vi
                .fn()
                .mockReturnValue(throwError(() => new Error('Network error'))),
            take: vi.fn(),
            treat: vi.fn(),
        };
        const useCase = createUseCase(repo);

        await expect(
            firstValueFrom(
                useCase.execute({
                    filter: { uniqId: 'PROC-005' },
                    permissions: { canTake: false, canTreat: false },
                })
            )
        ).rejects.toThrow('Network error');
    });
});
