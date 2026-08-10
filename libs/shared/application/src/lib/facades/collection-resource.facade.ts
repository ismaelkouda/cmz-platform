import { inject, signal } from '@angular/core';
import { DomainError, UnknownError } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { NotificationPort } from '../ports/notification.port';
import { TranslationPort } from '../ports/translation.port';
import { ErrorHandlerRegistry } from '../services/error-handler-registry.service';
import { PaginatedResourceFacade } from './paginated-resource.facade';

/**
 * Façade de collection signal-first : liste paginée (via `rxResource`, héritée
 * de [[PaginatedResourceFacade]]) + **mutations**. Les mutations sont des
 * actions one-shot (pas des ressources) : succès → `NotificationPort` (message
 * traduit) + `onSuccess` (typiquement `reload()`), échec → `ErrorHandlerRegistry`.
 * État d'action exposé en signaux.
 */
export abstract class CollectionResourceFacade<
    TEntity,
    TFilter,
> extends PaginatedResourceFacade<TEntity, TFilter> {
    private readonly notification = inject(NotificationPort);
    private readonly translation = inject(TranslationPort);
    private readonly mutationErrorHandler = inject(ErrorHandlerRegistry);

    protected readonly _actionState = signal<'idle' | 'loading'>('idle');
    readonly actionState = this._actionState.asReadonly();

    protected readonly _actionSuccess = signal(0);
    readonly actionSuccess = this._actionSuccess.asReadonly();

    protected readonly _actionError = signal<unknown | null>(null);
    readonly actionError = this._actionError.asReadonly();

    protected runAction<T>(
        action$: Observable<T>,
        successKey: string,
        onSuccess?: () => void
    ): void {
        this._actionState.set('loading');
        this._actionError.set(null);
        action$.subscribe({
            next: () => {
                this._actionSuccess.update((v) => v + 1);
                this.notification.success(
                    this.translation.translate(successKey)
                );
                onSuccess?.();
            },
            error: (err: unknown) => {
                this._actionError.set(err);
                // T3-1 (docs/architecture/taches-restantes.md, 2026-08-10) :
                // même garde-fou que `ResourceFacade` (voir ce fichier) — `err`
                // est `unknown`, converti plutôt que casté vers `DomainError`.
                this.mutationErrorHandler.handle(
                    err instanceof DomainError ? err : new UnknownError()
                );
                this._actionState.set('idle');
            },
            complete: () => this._actionState.set('idle'),
        });
    }
}
