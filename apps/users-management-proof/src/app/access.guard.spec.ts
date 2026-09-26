import { describe, expect, it } from 'vitest';

import { createBrowserAccessDecision, evaluateAppAccess } from './access.guard';
import type { AppAccessDecisionPort } from './access.guard';

function decision(
    authenticated: boolean,
    granted: readonly string[] = []
): AppAccessDecisionPort {
    return {
        isAuthenticated: () => authenticated,
        hasPermission: (permission) => granted.includes(permission),
    };
}

describe('evaluateAppAccess', () => {
    it('autorise une page publique sans port', () => {
        expect(
            evaluateAppAccess({ mode: 'public', permissions: [] }, null)
        ).toBe(true);
    });

    it('refuse une page connectée sans session', () => {
        expect(
            evaluateAppAccess({ mode: 'authenticated', permissions: [] }, null)
        ).toBe(false);
        expect(
            evaluateAppAccess(
                { mode: 'authenticated', permissions: [] },
                decision(false)
            )
        ).toBe(false);
    });

    it('exige toutes les permissions d’une page autorisée', () => {
        const policy = {
            mode: 'authorized' as const,
            permissions: ['reports.read', 'reports.write'],
        };
        expect(
            evaluateAppAccess(
                { mode: 'authorized', permissions: [] },
                decision(true)
            )
        ).toBe(false);
        expect(
            evaluateAppAccess(policy, decision(true, ['reports.read']))
        ).toBe(false);
        expect(
            evaluateAppAccess(policy, decision(true, policy.permissions))
        ).toBe(true);
    });

    it('refuse une politique absente ou incohérente', () => {
        expect(evaluateAppAccess(undefined, decision(true))).toBe(false);
        expect(
            evaluateAppAccess(
                { mode: 'public', permissions: ['unexpected'] },
                null
            )
        ).toBe(false);
    });
});

describe('createBrowserAccessDecision', () => {
    it.each([
        undefined,
        null,
        true,
        {},
        { authenticated: false, permissions: [] },
        { authenticated: true, permissions: 'users.create' },
        { authenticated: true, permissions: [''] },
        { authenticated: true, permissions: [1] },
        {
            authenticated: true,
            permissions: ['users.create'],
            unexpected: true,
        },
    ])('échoue fermé pour un contexte absent ou invalide', (raw) => {
        const access = createBrowserAccessDecision(raw);

        expect(access.isAuthenticated()).toBe(false);
        expect(access.hasPermission('users.create')).toBe(false);
    });

    it('expose uniquement les permissions explicites du host', () => {
        const access = createBrowserAccessDecision({
            authenticated: true,
            permissions: ['users.create'],
        });

        expect(access.isAuthenticated()).toBe(true);
        expect(access.hasPermission('users.create')).toBe(true);
        expect(access.hasPermission('users.delete')).toBe(false);
    });
});
