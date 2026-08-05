// Angular JIT compiler — requis pour les décorateurs Angular dans Vitest.
import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import {
    FinalizationDetailsEntity,
    FinalizationDetailsRepository,
    FinalizationDetailsFinalizationState,
} from '@cmz/finalization-domain';
import type { FinalizationDetailsProps } from '@cmz/finalization-domain';
import { FinalizationDetailsUseCase } from './finalization-details.use-case';

function makeDetails(uniqId = 'FIN-001'): FinalizationDetailsEntity {
    const props = {
        uniqId,
        reportType: 'ABI',
        operators: ['MTN'],
        description: 'Description',
        placeDescription: 'Lieu',
        placePhoto: 'https://example.com/photo.jpg',
        finalizationState: FinalizationDetailsFinalizationState.IN_PROGRESS,
        location: {
            coordinates: { latitude: 3.86, longitude: 11.5, what3words: '' },
            name: 'residence_place',
            description: '',
            method: 'gps',
            type: 'point',
        },
        media: null,
    } as unknown as FinalizationDetailsProps;

    return new FinalizationDetailsEntity(props, {
        canTake: true,
        canFinalize: true,
    });
}

function createUseCase(
    repo: FinalizationDetailsRepository
): FinalizationDetailsUseCase {
    const injector = createEnvironmentInjector(
        [
            { provide: FinalizationDetailsRepository, useValue: repo },
            FinalizationDetailsUseCase,
        ],
        null as never
    );
    return injector.get(FinalizationDetailsUseCase);
}

describe('FinalizationDetailsUseCase', () => {
    it('charge la fiche avec filtre validé et permissions appliquées', async () => {
        const details = makeDetails();
        const repo: FinalizationDetailsRepository = {
            execute: vi.fn().mockReturnValue(of(details)),
            take: vi.fn(),
            finalize: vi.fn(),
        };
        const useCase = createUseCase(repo);

        const result = await firstValueFrom(
            useCase.execute({
                filter: { uniqId: ' FIN-001 ' },
                permissions: { canTake: false, canFinalize: true },
            })
        );

        expect(repo.execute).toHaveBeenCalledWith(
            expect.objectContaining({ uniqId: 'FIN-001' }),
            undefined
        );
        expect(result.canFinalize).toBe(true);
        expect(result.canTake).toBe(false);
    });

    it('délègue take au repository', async () => {
        const repo: FinalizationDetailsRepository = {
            execute: vi.fn(),
            take: vi.fn().mockReturnValue(of(undefined)),
            finalize: vi.fn(),
        };
        const useCase = createUseCase(repo);

        await firstValueFrom(useCase.take({ uniqId: ' FIN-002 ' }));

        expect(repo.take).toHaveBeenCalledWith(
            expect.objectContaining({ uniqId: 'FIN-002' })
        );
    });

    it('délègue finalize au repository via fromContract', async () => {
        const repo: FinalizationDetailsRepository = {
            execute: vi.fn(),
            take: vi.fn(),
            finalize: vi.fn().mockReturnValue(of(undefined)),
        };
        const useCase = createUseCase(repo);

        await firstValueFrom(
            useCase.finalize({
                uniqId: ' FIN-003 ',
                comment: 'OK',
            })
        );

        expect(repo.finalize).toHaveBeenCalledWith(
            expect.objectContaining({
                uniqId: 'FIN-003',
                comment: 'OK',
            })
        );
    });

    it('propage les erreurs repository via defer', async () => {
        const repo: FinalizationDetailsRepository = {
            execute: vi
                .fn()
                .mockReturnValue(throwError(() => new Error('Network error'))),
            take: vi.fn(),
            finalize: vi.fn(),
        };
        const useCase = createUseCase(repo);

        await expect(
            firstValueFrom(
                useCase.execute({
                    filter: { uniqId: 'FIN-005' },
                    permissions: { canTake: false, canFinalize: false },
                })
            )
        ).rejects.toThrow('Network error');
    });
});
