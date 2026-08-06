// Angular JIT compiler — requis pour les décorateurs Angular dans Vitest.
import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import {
    RequestsDetailsEntity,
    RequestsDetailsRepository,
    RequestsDetailsStatus,
} from '@cmz/requests-domain';
import type { RequestsDetailsProps } from '@cmz/requests-domain';
import { RequestsDetailsUseCase } from './requests-details.use-case';

function makeDetails(uniqId = 'REQ-001'): RequestsDetailsEntity {
    const props = {
        uniqId,
        reportType: 'ABI',
        operators: ['MTN'],
        description: 'Description',
        placeDescription: 'Lieu',
        placePhoto: 'https://example.com/photo.jpg',
        status: RequestsDetailsStatus.IN_PROGRESS,
        qualificationState: 'pending',
        location: {
            coordinates: { latitude: 3.86, longitude: 11.5, what3words: '' },
            name: 'residence_place',
            description: '',
            method: 'gps',
            type: 'point',
        },
        media: null,
    } as unknown as RequestsDetailsProps;

    return new RequestsDetailsEntity(props, {
        canTake: true,
        canQualify: true,
    });
}

function createUseCase(
    repo: RequestsDetailsRepository
): RequestsDetailsUseCase {
    const injector = createEnvironmentInjector(
        [
            { provide: RequestsDetailsRepository, useValue: repo },
            RequestsDetailsUseCase,
        ],
        null as never
    );
    return injector.get(RequestsDetailsUseCase);
}

describe('RequestsDetailsUseCase', () => {
    it('charge la fiche avec filtre validé et permissions appliquées', async () => {
        const details = makeDetails();
        const repo: RequestsDetailsRepository = {
            execute: vi.fn().mockReturnValue(of(details)),
            take: vi.fn(),
            approve: vi.fn(),
            reject: vi.fn(),
        };
        const useCase = createUseCase(repo);

        const result = await firstValueFrom(
            useCase.execute({
                filter: { uniqId: ' REQ-001 ' },
                permissions: { canTake: false, canQualify: true },
            })
        );

        expect(repo.execute).toHaveBeenCalledWith(
            expect.objectContaining({ uniqId: 'REQ-001' }),
            undefined
        );
        expect(result.canQualify).toBe(true);
        expect(result.canTake).toBe(false);
    });

    it('délègue take au repository', async () => {
        const repo: RequestsDetailsRepository = {
            execute: vi.fn(),
            take: vi.fn().mockReturnValue(of(undefined)),
            approve: vi.fn(),
            reject: vi.fn(),
        };
        const useCase = createUseCase(repo);

        await firstValueFrom(useCase.take({ uniqId: ' REQ-002 ' }));

        expect(repo.take).toHaveBeenCalledWith(
            expect.objectContaining({ uniqId: 'REQ-002' })
        );
    });

    it('délègue approve au repository via fromDetails', async () => {
        const details = makeDetails('REQ-003');
        const repo: RequestsDetailsRepository = {
            execute: vi.fn(),
            take: vi.fn(),
            approve: vi.fn().mockReturnValue(of(undefined)),
            reject: vi.fn(),
        };
        const useCase = createUseCase(repo);

        await firstValueFrom(
            useCase.approve(details, {
                decision: 'accepted',
                comment: 'OK',
                reason: '',
                approvalType: 'view',
                callbackType: null,
            })
        );

        expect(repo.approve).toHaveBeenCalledWith(
            expect.objectContaining({
                uniqId: 'REQ-003',
                comment: 'OK',
            })
        );
    });

    it('délègue reject au repository via fromDetails', async () => {
        const details = makeDetails('REQ-004');
        const repo: RequestsDetailsRepository = {
            execute: vi.fn(),
            take: vi.fn(),
            approve: vi.fn(),
            reject: vi.fn().mockReturnValue(of(undefined)),
        };
        const useCase = createUseCase(repo);

        await firstValueFrom(
            useCase.reject(details, {
                decision: 'rejected',
                comment: 'Non conforme',
                reason: 'motif',
                approvalType: 'view',
                callbackType: null,
            })
        );

        expect(repo.reject).toHaveBeenCalledWith(
            expect.objectContaining({
                uniqId: 'REQ-004',
                comment: 'Non conforme',
            })
        );
    });

    it('propage les erreurs repository via defer', async () => {
        const repo: RequestsDetailsRepository = {
            execute: vi
                .fn()
                .mockReturnValue(throwError(() => new Error('Network error'))),
            take: vi.fn(),
            approve: vi.fn(),
            reject: vi.fn(),
        };
        const useCase = createUseCase(repo);

        await expect(
            firstValueFrom(
                useCase.execute({
                    filter: { uniqId: 'REQ-005' },
                    permissions: { canTake: false, canQualify: false },
                })
            )
        ).rejects.toThrow('Network error');
    });
});
