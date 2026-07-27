import { Service, inject } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    MobileNetworkCreateContract,
    MobileNetworkDeleteContract,
    MobileNetworkEnableContract,
    MobileNetworkDisableContract,
    MobileNetworkEntity,
    MobileNetworkFilterContract,
    MobileNetworkRepository,
    MobileNetworkUpdateContract,
    mobileNetworkCreateVo,
    mobileNetworkDeleteVo,
    mobileNetworkEnableVo,
    mobileNetworkDisableVo,
    mobileNetworkFilterEntity,
    mobileNetworkFilterVo,
    mobileNetworkUpdateVo,
} from '@cmz/coverage-areas-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class MobileNetworkUseCase {
    private readonly repository = inject(MobileNetworkRepository);

    execute(
        contract: MobileNetworkFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<MobileNetworkEntity>> {
        return defer(() =>
            this.repository.execute(
                mobileNetworkFilterEntity(mobileNetworkFilterVo(contract)),
                page,
                options
            )
        );
    }

    create(contract: MobileNetworkCreateContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.create(mobileNetworkCreateVo(contract))
        );
    }

    update(contract: MobileNetworkUpdateContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.update(mobileNetworkUpdateVo(contract))
        );
    }

    delete(contract: MobileNetworkDeleteContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.delete(mobileNetworkDeleteVo(contract))
        );
    }

    enable(contract: MobileNetworkEnableContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.enable(mobileNetworkEnableVo(contract))
        );
    }

    disable(contract: MobileNetworkDisableContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.disable(mobileNetworkDisableVo(contract))
        );
    }
}
