import { Service, inject } from '@angular/core';
import { CollectionResourceFacade, PageQuery } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    PrivacyPolicyCreateContract,
    PrivacyPolicyDeleteContract,
    PrivacyPolicyUnpublishContract,
    PrivacyPolicyEntity,
    PrivacyPolicyPublishContract,
    PrivacyPolicyFilterContract,
    PrivacyPolicyUpdateContract,
} from '@cmz/content-management-domain';
import { PrivacyPolicyUseCase } from '../use-cases/privacy-policy.use-case';

@Service()
export class PrivacyPolicyFacade extends CollectionResourceFacade<
    PrivacyPolicyEntity,
    PrivacyPolicyFilterContract
> {
    private readonly useCase = inject(PrivacyPolicyUseCase);

    protected stream(
        params: PageQuery<PrivacyPolicyFilterContract>
    ): Observable<PageResult<PrivacyPolicyEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    create(contract: PrivacyPolicyCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.reload()
        );
    }

    update(contract: PrivacyPolicyUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    delete(contract: PrivacyPolicyDeleteContract): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.reload()
        );
    }

    publish(contract: PrivacyPolicyPublishContract): void {
        this.runAction(
            this.useCase.publish(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    unpublish(contract: PrivacyPolicyUnpublishContract): void {
        this.runAction(
            this.useCase.unpublish(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }
}
