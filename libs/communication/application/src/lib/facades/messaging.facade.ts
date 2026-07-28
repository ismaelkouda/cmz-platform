import { Service, inject } from '@angular/core';
import { CollectionResourceFacade, PageQuery } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    MessagingCreateContract,
    MessagingDeleteValidateContract,
    MessagingDisableValidateContract,
    MessagingEnableValidateContract,
    MessagingEntity,
    MessagingFilterContract,
    MessagingUpdateContract,
} from '@cmz/communication-domain';
import { MessagingUseCase } from '../use-cases/messaging.use-case';

@Service()
export class MessagingFacade extends CollectionResourceFacade<
    MessagingEntity,
    MessagingFilterContract
> {
    private readonly useCase = inject(MessagingUseCase);

    protected stream(
        params: PageQuery<MessagingFilterContract>
    ): Observable<PageResult<MessagingEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    create(contract: MessagingCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.reload()
        );
    }

    update(contract: MessagingUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    delete(contract: Partial<MessagingDeleteValidateContract>): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.reload()
        );
    }

    enable(contract: Partial<MessagingEnableValidateContract>): void {
        this.runAction(
            this.useCase.enable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    disable(contract: Partial<MessagingDisableValidateContract>): void {
        this.runAction(
            this.useCase.disable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }
}
