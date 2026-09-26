import { describe, expect, it } from 'vitest';

import { createProofAccessDecision } from './proof-access.adapter';

describe('createProofAccessDecision', () => {
    it.each([
        undefined,
        null,
        true,
        {},
        { authenticated: false, permissions: [] },
        { authenticated: true, permissions: 'users.create' },
        { authenticated: true, permissions: [''] },
        { authenticated: true, permissions: ['users/create'] },
        {
            authenticated: true,
            permissions: ['users.create'],
            unexpected: true,
        },
    ])('échoue fermé pour un contexte absent ou invalide', (raw) => {
        const decision = createProofAccessDecision(raw);

        expect(decision.isAuthenticated()).toBe(false);
        expect(decision.hasPermission('users.create')).toBe(false);
    });

    it('expose uniquement les permissions explicites du host de preuve', () => {
        const decision = createProofAccessDecision({
            authenticated: true,
            permissions: ['users.create'],
        });

        expect(decision.isAuthenticated()).toBe(true);
        expect(decision.hasPermission('users.create')).toBe(true);
        expect(decision.hasPermission('users.delete')).toBe(false);
    });
});
