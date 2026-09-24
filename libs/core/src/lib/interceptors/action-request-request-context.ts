import { HttpContext } from '@angular/common/http';

import { SKIP_AUTH } from './auth-context.token';

export interface ActionRequestRequestPolicy {
    readonly authentication: { readonly mode: 'host' | 'omit' };
}

/**
 * Unique Angular-host translation of the target-neutral action policy.
 * Generated clients use the host token observed by its interceptors instead
 * of creating a private HttpContextToken that the application cannot see.
 */
export function createActionRequestContext(
    policy: ActionRequestRequestPolicy
): HttpContext {
    return new HttpContext().set(
        SKIP_AUTH,
        policy.authentication.mode === 'omit'
    );
}
