import { describe, expect, it } from 'vitest';

import { SKIP_AUTH } from './auth-context.token';
import { BYPASS_CACHE } from './cache-context.token';
import { createListQueryRequestContext } from './list-query-request-context';

describe('createListQueryRequestContext', () => {
    it('omet les credentials publics avec le token exact lu par le host', () => {
        const context = createListQueryRequestContext(
            {
                authentication: { mode: 'omit' },
                cache: {
                    mode: 'host',
                    scope: 'public',
                    refresh: 'bypass',
                },
            },
            { isRefresh: false }
        );

        expect(context.get(SKIP_AUTH)).toBe(true);
        expect(context.get(BYPASS_CACHE)).toBe(false);
    });

    it('conserve l’auth du host et contourne le cache seulement au refresh', () => {
        const policy = {
            authentication: { mode: 'host' as const },
            cache: {
                mode: 'host' as const,
                scope: 'principal' as const,
                refresh: 'bypass' as const,
            },
        };

        const initial = createListQueryRequestContext(policy, {
            isRefresh: false,
        });
        const refresh = createListQueryRequestContext(policy, {
            isRefresh: true,
        });

        expect(initial.get(SKIP_AUTH)).toBe(false);
        expect(initial.get(BYPASS_CACHE)).toBe(false);
        expect(refresh.get(SKIP_AUTH)).toBe(false);
        expect(refresh.get(BYPASS_CACHE)).toBe(true);
    });
});
