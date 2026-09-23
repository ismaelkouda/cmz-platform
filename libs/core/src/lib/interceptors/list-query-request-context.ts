import { HttpContext } from '@angular/common/http';

import { SKIP_AUTH } from './auth-context.token';
import { BYPASS_CACHE } from './cache-context.token';

export interface ListQueryRequestPolicy {
    readonly authentication: { readonly mode: 'host' | 'omit' };
    readonly cache: {
        readonly mode: 'host';
        readonly refresh: 'bypass';
        readonly scope: 'principal' | 'public' | 'tenant';
    };
}

/**
 * Unique Angular-host translation of the target-neutral list-query policy.
 * Generated clients must use this function instead of declaring private
 * HttpContextToken instances that host interceptors cannot observe.
 */
export function createListQueryRequestContext(
    policy: ListQueryRequestPolicy,
    options: { readonly isRefresh: boolean }
): HttpContext {
    return new HttpContext()
        .set(SKIP_AUTH, policy.authentication.mode === 'omit')
        .set(
            BYPASS_CACHE,
            options.isRefresh && policy.cache.refresh === 'bypass'
        );
}
