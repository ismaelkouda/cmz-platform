import { inject, signal } from '@angular/core';
import { DomainError } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { NotificationPort } from '../ports/notification.port';
import { TranslationPort } from '../ports/translation.port';
import { ErrorHandlerRegistry } from '../services/error-handler-registry.service';
import { PaginatedFacade } from './paginated.facade';

/**
 * Facade de collection **signal-based** : liste paginée (héritée de
 * `PaginatedFacade`) + mutations (create/update/delete/…). Les actions
 * exposent un état signal (`actionState`/`actionSuccess`/`actionError`) et
 * routent le succès vers `NotificationPort` (message traduit) et l'échec vers
 * `ErrorHandlerRegistry` (loop d'erreurs). Aucune dépendance UI : la couche
 * application ne parle qu'aux ports agnostiques.
 */
export abstract class CollectionFacade<
    TEntity,
    TFilter,
> extends PaginatedFacade<TEntity, TFilter> {
    private readonly mutationErrorHandler = inject(ErrorHandlerRegistry);
    private readonly notification = inject(NotificationPort);
    private readonly translation = inject(TranslationPort);

    protected readonly _actionState = signal<'idle' | 'loading'>('idle');
    readonly actionState = this._actionState.asReadonly();

    protected readonly _actionSuccess = signal(0);
    readonly actionSuccess = this._actionSuccess.asReadonly();

    protected readonly _actionError = signal<unknown | null>(null);
    readonly actionError = this._actionError.asReadonly();

    /**
     * Exécute une action (mutation), gère l'état et le feedback.
     * Succès → toast traduit (`successKey`) + `onSuccess` (ex. rafraîchir la
     * liste). Échec → `ErrorHandlerRegistry` (rendu dans la loop).
     */
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
                this.mutationErrorHandler.handle(err as DomainError);
                this._actionState.set('idle');
            },
            complete: () => this._actionState.set('idle'),
        });
    }
}
