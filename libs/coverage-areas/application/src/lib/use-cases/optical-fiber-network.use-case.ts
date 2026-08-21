import { Service, inject } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    OpticalFiberNetworkCreateContract,
    OpticalFiberNetworkDeleteContract,
    OpticalFiberNetworkEnableContract,
    OpticalFiberNetworkDisableContract,
    OpticalFiberNetworkEntity,
    OpticalFiberNetworkFilterContract,
    OpticalFiberNetworkRepository,
    OpticalFiberNetworkUpdateContract,
    opticalFiberNetworkCreateVo,
    opticalFiberNetworkDeleteVo,
    opticalFiberNetworkEnableVo,
    opticalFiberNetworkDisableVo,
    opticalFiberNetworkFilterEntity,
    opticalFiberNetworkFilterVo,
    opticalFiberNetworkUpdateVo,
} from '@cmz/coverage-areas-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class OpticalFiberNetworkUseCase {
    private readonly repository = inject(OpticalFiberNetworkRepository);

    execute(
        contract: OpticalFiberNetworkFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<OpticalFiberNetworkEntity>> {
        return defer(() =>
            this.repository.execute(
                opticalFiberNetworkFilterEntity(
                    opticalFiberNetworkFilterVo(contract)
                ),
                page,
                options
            )
        );
    }

    create(
        contract: OpticalFiberNetworkCreateContract
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.create(opticalFiberNetworkCreateVo(contract))
        );
    }

    update(
        contract: OpticalFiberNetworkUpdateContract
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.update(opticalFiberNetworkUpdateVo(contract))
        );
    }

    delete(
        contract: OpticalFiberNetworkDeleteContract
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.delete(opticalFiberNetworkDeleteVo(contract))
        );
    }

    enable(
        contract: OpticalFiberNetworkEnableContract
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.enable(opticalFiberNetworkEnableVo(contract))
        );
    }

    disable(
        contract: OpticalFiberNetworkDisableContract
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.disable(opticalFiberNetworkDisableVo(contract))
        );
    }
}
