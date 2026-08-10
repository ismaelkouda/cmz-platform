import { computed, effect, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DomainError, UnknownError } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { ErrorHandlerRegistry } from '../services/error-handler-registry.service';

/**
 * Façade de ressource **signal-first (Angular 22)** : la lecture asynchrone est
 * portée par `rxResource` — `value`/`isLoading`/`error`/`status` sont des
 * signaux dérivés du framework (plus de `.subscribe()` manuel ni d'état de
 * chargement tenu à la main). Le chargement est déclenché en posant les
 * paramètres (`setParams`) ; `undefined` laisse la ressource au repos.
 * Les erreurs sont routées vers `ErrorHandlerRegistry` (loop) via un `effect`.
 */
export abstract class ResourceFacade<TData, TParams> {
    private readonly errorHandler = inject(ErrorHandlerRegistry);

    protected readonly _params = signal<TParams | undefined>(undefined);

    /** Flux de données pour des paramètres donnés (fourni par le concret). */
    protected abstract stream(params: TParams): Observable<TData>;

    protected readonly resource = rxResource<TData, TParams | undefined>({
        params: () => this._params(),
        stream: ({ params }) => this.stream(params as TParams),
    });

    /**
     * Valeur **sûre** : `undefined` tant qu'il n'y a pas de valeur (repos,
     * chargement, erreur). `resource.value()` lève en état d'erreur (contrat
     * Angular) ; on garde avec `hasValue()` et on expose l'erreur via `error`.
     */
    readonly value = computed(() =>
        this.resource.hasValue() ? this.resource.value() : undefined
    );
    readonly isLoading = this.resource.isLoading;
    readonly error = this.resource.error;
    readonly status = this.resource.status;

    constructor() {
        effect(() => {
            const err = this.resource.error();
            if (err) {
                // T3-1 (docs/architecture/taches-restantes.md, 2026-08-10) :
                // `err` est `unknown` (contrat `rxResource`) — un `as DomainError`
                // ici est un cast, pas une conversion, et reproduit le bug déjà
                // documenté et corrigé côté transport (`error.interceptor.ts`) :
                // si `err` n'est pas un vrai `DomainError`, `ErrorHandlerRegistry`
                // retombe sur le handler par défaut avec un `messageKey`
                // `undefined` → toast vide. `errorInterceptor` convertit déjà les
                // échecs de transport en `DomainError` réel, donc ce garde-fou ne
                // devrait normalement jamais tomber sur la branche `UnknownError`
                // — il couvre les erreurs qui échapperaient à l'intercepteur
                // (ex. exception levée par un mapper avant l'enveloppe HTTP).
                this.errorHandler.handle(
                    err instanceof DomainError ? err : new UnknownError()
                );
            }
        });
    }

    protected setParams(params: TParams): void {
        this._params.set(params);
    }

    /** Relance le chargement avec les paramètres courants. */
    reload(): void {
        this.resource.reload();
    }
}
