import { Service, inject } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    HomeCreateContract,
    HomeDeleteContract,
    HomeDisableContract,
    HomeEntity,
    HomeEnableContract,
    HomeFilterContract,
    HomeRepository,
    HomeUpdateContract,
    homeCreateVo,
    homeDeleteVo,
    homeDisableVo,
    homeEnableVo,
    homeFilterEntity,
    homeFilterVo,
    homeUpdateVo,
} from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class HomeUseCase {
    private readonly repository = inject(HomeRepository);

    execute(
        contract: HomeFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<HomeEntity>> {
        return defer(() =>
            this.repository.execute(
                homeFilterEntity(homeFilterVo(contract)),
                page,
                options
            )
        );
    }

    create(contract: HomeCreateContract): Observable<MessageEntity> {
        return defer(() => this.repository.create(homeCreateVo(contract)));
    }

    update(contract: HomeUpdateContract): Observable<MessageEntity> {
        return defer(() => this.repository.update(homeUpdateVo(contract)));
    }

    delete(contract: HomeDeleteContract): Observable<MessageEntity> {
        return defer(() => this.repository.delete(homeDeleteVo(contract)));
    }

    enable(contract: HomeEnableContract): Observable<MessageEntity> {
        return defer(() => this.repository.enable(homeEnableVo(contract)));
    }

    disable(contract: HomeDisableContract): Observable<MessageEntity> {
        return defer(() => this.repository.disable(homeDisableVo(contract)));
    }
}
