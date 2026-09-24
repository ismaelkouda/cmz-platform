import { describe, expect, it } from 'vitest';

import { SKIP_AUTH } from './auth-context.token';
import { createActionRequestContext } from './action-request-request-context';

describe('createActionRequestContext', () => {
    it('marque une action publique avec le token exact du host', () => {
        const context = createActionRequestContext({
            authentication: { mode: 'omit' },
        });

        expect(context.get(SKIP_AUTH)).toBe(true);
    });

    it('laisse le host attacher son authentification pour une action protégée', () => {
        const context = createActionRequestContext({
            authentication: { mode: 'host' },
        });

        expect(context.get(SKIP_AUTH)).toBe(false);
    });
});
