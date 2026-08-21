import { Service, inject } from '@angular/core';
import { CollectionResourceFacade, PageQuery } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    NotificationsEntity,
    NotificationsFilterContract,
    NotificationsReadOneValidateContract,
} from '@cmz/communication-domain';
import { NotificationsUseCase } from '../use-cases/notifications.use-case';

/**
 * `CollectionResourceFacade` (pas `PaginatedResourceFacade`) : contrairement
 * à `AccessLogsFacade` (zéro mutation), cette entité porte deux actions
 * réelles (`readOne`/`readAll`) — pas du CRUD classique, mais `runAction`
 * ne suppose rien de spécifique à create/update/delete, il s'applique tout
 * aussi bien ici.
 *
 * `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts).
 */
@Service({ autoProvided: false })
export class NotificationsFacade extends CollectionResourceFacade<
    NotificationsEntity,
    NotificationsFilterContract
> {
    private readonly useCase = inject(NotificationsUseCase);

    protected stream(
        params: PageQuery<NotificationsFilterContract>
    ): Observable<PageResult<NotificationsEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    readOne(contract: Partial<NotificationsReadOneValidateContract>): void {
        this.runAction(
            this.useCase.readOne(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    readAll(): void {
        this.runAction(this.useCase.readAll(), 'COMMON.SUCCESS.UPDATE', () =>
            this.reload()
        );
    }
}
