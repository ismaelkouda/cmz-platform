import { Service, inject } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    PrivacyPolicyCreateContract,
    PrivacyPolicyDeleteContract,
    PrivacyPolicyUnpublishContract,
    PrivacyPolicyEntity,
    PrivacyPolicyPublishContract,
    PrivacyPolicyFilterContract,
    PrivacyPolicyRepository,
    PrivacyPolicyUpdateContract,
    privacyPolicyCreateVo,
    privacyPolicyDeleteVo,
    privacyPolicyUnpublishVo,
    privacyPolicyPublishVo,
    privacyPolicyFilterEntity,
    privacyPolicyFilterVo,
    privacyPolicyUpdateVo,
} from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class PrivacyPolicyUseCase {
    private readonly repository = inject(PrivacyPolicyRepository);

    execute(
        contract: PrivacyPolicyFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<PrivacyPolicyEntity>> {
        return defer(() =>
            this.repository.execute(
                privacyPolicyFilterEntity(privacyPolicyFilterVo(contract)),
                page,
                options
            )
        );
    }

    create(contract: PrivacyPolicyCreateContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.create(privacyPolicyCreateVo(contract))
        );
    }

    update(contract: PrivacyPolicyUpdateContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.update(privacyPolicyUpdateVo(contract))
        );
    }

    delete(contract: PrivacyPolicyDeleteContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.delete(privacyPolicyDeleteVo(contract))
        );
    }

    publish(contract: PrivacyPolicyPublishContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.publish(privacyPolicyPublishVo(contract))
        );
    }

    unpublish(
        contract: PrivacyPolicyUnpublishContract
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.unpublish(privacyPolicyUnpublishVo(contract))
        );
    }
}
