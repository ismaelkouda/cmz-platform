import { Service, inject } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    TermsUseCreateContract,
    TermsUseDeleteContract,
    TermsUseUnpublishContract,
    TermsUseEntity,
    TermsUsePublishContract,
    TermsUseFilterContract,
    TermsUseRepository,
    TermsUseUpdateContract,
    termsUseCreateVo,
    termsUseDeleteVo,
    termsUseUnpublishVo,
    termsUsePublishVo,
    termsUseFilterEntity,
    termsUseFilterVo,
    termsUseUpdateVo,
} from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class TermsUseUseCase {
    private readonly repository = inject(TermsUseRepository);

    execute(
        contract: TermsUseFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<TermsUseEntity>> {
        return defer(() =>
            this.repository.execute(
                termsUseFilterEntity(termsUseFilterVo(contract)),
                page,
                options
            )
        );
    }

    create(contract: TermsUseCreateContract): Observable<MessageEntity> {
        return defer(() => this.repository.create(termsUseCreateVo(contract)));
    }

    update(contract: TermsUseUpdateContract): Observable<MessageEntity> {
        return defer(() => this.repository.update(termsUseUpdateVo(contract)));
    }

    delete(contract: TermsUseDeleteContract): Observable<MessageEntity> {
        return defer(() => this.repository.delete(termsUseDeleteVo(contract)));
    }

    publish(contract: TermsUsePublishContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.publish(termsUsePublishVo(contract))
        );
    }

    unpublish(contract: TermsUseUnpublishContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.unpublish(termsUseUnpublishVo(contract))
        );
    }
}
