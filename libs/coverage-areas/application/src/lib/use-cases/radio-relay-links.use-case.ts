import { Service, inject } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    RadioRelayLinksCreateContract,
    RadioRelayLinksDeleteContract,
    RadioRelayLinksEnableContract,
    RadioRelayLinksDisableContract,
    RadioRelayLinksEntity,
    RadioRelayLinksFilterContract,
    RadioRelayLinksRepository,
    RadioRelayLinksUpdateContract,
    radioRelayLinksCreateVo,
    radioRelayLinksDeleteVo,
    radioRelayLinksEnableVo,
    radioRelayLinksDisableVo,
    radioRelayLinksFilterEntity,
    radioRelayLinksFilterVo,
    radioRelayLinksUpdateVo,
} from '@cmz/coverage-areas-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class RadioRelayLinksUseCase {
    private readonly repository = inject(RadioRelayLinksRepository);

    execute(
        contract: RadioRelayLinksFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<RadioRelayLinksEntity>> {
        return defer(() =>
            this.repository.execute(
                radioRelayLinksFilterEntity(radioRelayLinksFilterVo(contract)),
                page,
                options
            )
        );
    }

    create(contract: RadioRelayLinksCreateContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.create(radioRelayLinksCreateVo(contract))
        );
    }

    update(contract: RadioRelayLinksUpdateContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.update(radioRelayLinksUpdateVo(contract))
        );
    }

    delete(contract: RadioRelayLinksDeleteContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.delete(radioRelayLinksDeleteVo(contract))
        );
    }

    enable(contract: RadioRelayLinksEnableContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.enable(radioRelayLinksEnableVo(contract))
        );
    }

    disable(
        contract: RadioRelayLinksDisableContract
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.disable(radioRelayLinksDisableVo(contract))
        );
    }
}
