import { Service, inject, signal } from '@angular/core';
import { DomainError } from '@cmz/shared-domain';
import { catchError, defer, tap, throwError, type Observable } from 'rxjs';

import { CreateUserSource } from './create-user.source';
import type { CreateUserInput, CreateUserResult } from './models';

export type CreateUserState =
    | 'idle'
    | 'submitting'
    | 'applying-post-success'
    | 'success'
    | 'error'
    | 'committed-with-local-error';

export class ActionRequestPendingError extends DomainError {
    readonly code = 'ACTION_REQUEST_PENDING';
    readonly messageKey = 'ERRORS.ACTION_REQUEST.PENDING';
    readonly statusCode = 409;

    constructor() {
        super('Action request is already pending');
    }
}

@Service({ autoProvided: false })
export class CreateUserFacade {
    private readonly source = inject(CreateUserSource);
    private readonly _state = signal<CreateUserState>('idle');
    private readonly _result = signal<CreateUserResult | undefined>(undefined);
    private readonly _error = signal<unknown>(undefined);

    readonly state = this._state.asReadonly();
    readonly result = this._result.asReadonly();
    readonly error = this._error.asReadonly();

    submit(input: CreateUserInput): Observable<CreateUserResult> {
        return defer(() => {
            if (this._state() === 'submitting') {
                throw new ActionRequestPendingError();
            }
            this._state.set('submitting');
            this._error.set(undefined);
            this._result.set(undefined);
            return this.source.execute(input);
        }).pipe(
            tap((result) => {
                this._result.set(result);
                this._state.set('success');
            }),
            catchError((error: unknown) => {
                if (!(error instanceof ActionRequestPendingError)) {
                    this._error.set(error);
                    this._state.set('error');
                }
                return throwError(() => error);
            })
        );
    }
}
