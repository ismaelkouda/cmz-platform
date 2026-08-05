import { Injector } from '@angular/core';
import { UsersRepository } from '@cmz/settings-security-domain';
import { MessageEntity, PageResult } from '@cmz/shared-domain';
import { firstValueFrom, of } from 'rxjs';
import { UsersUseCase } from './users.use-case';

describe('UsersUseCase', () => {
    let useCase: UsersUseCase;
    let mockRepository: Partial<UsersRepository>;

    beforeEach(() => {
        mockRepository = {
            execute: vi
                .fn()
                .mockReturnValue(
                    of({
                        data: [],
                        meta: {
                            page: 1,
                            total: 0,
                            perPage: 10,
                            pageCount: 0,
                            hasPrev: false,
                            hasNext: false,
                        },
                    } as PageResult<any>)
                ),
            create: vi
                .fn()
                .mockReturnValue(of({ message: 'Success' } as MessageEntity)),
            update: vi
                .fn()
                .mockReturnValue(of({ message: 'Updated' } as MessageEntity)),
            delete: vi
                .fn()
                .mockReturnValue(of({ message: 'Deleted' } as MessageEntity)),
            enable: vi
                .fn()
                .mockReturnValue(of({ message: 'Enabled' } as MessageEntity)),
            disable: vi
                .fn()
                .mockReturnValue(of({ message: 'Disabled' } as MessageEntity)),
        };

        const injector = Injector.create({
            providers: [
                UsersUseCase,
                { provide: UsersRepository, useValue: mockRepository },
            ],
        });

        useCase = injector.get(UsersUseCase);
    });

    it('exécute le cas d usage de liste avec le repository', async () => {
        const result = await firstValueFrom(useCase.execute({}, '1'));
        expect(mockRepository.execute).toHaveBeenCalled();
        expect(result.data).toEqual([]);
    });

    it('exécute la création d un utilisateur', async () => {
        const contract = {
            firstName: 'Jean',
            lastName: 'Dupont',
            email: 'jean.dupont@example.com',
            phone: '+22507000000',
            profileId: 'prof-1',
        };
        const res = await firstValueFrom(useCase.create(contract));
        expect(mockRepository.create).toHaveBeenCalled();
        expect(res.message).toBe('Success');
    });
});
