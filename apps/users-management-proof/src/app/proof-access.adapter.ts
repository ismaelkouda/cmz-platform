import { type Provider } from '@angular/core';

import {
    APP_ACCESS_DECISION,
    type AppAccessDecisionPort,
} from './access.guard';

const PERMISSION_ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;

declare global {
    interface Window {
        /**
         * Contexte injecté par le host de preuve avant le bootstrap Angular.
         * Il ne constitue jamais une autorité backend.
         */
        __cmzUsersManagementProofAccess?: unknown;
    }
}

function denyAll(): AppAccessDecisionPort {
    return Object.freeze({
        isAuthenticated: () => false,
        hasPermission: () => false,
    });
}

export function createProofAccessDecision(raw: unknown): AppAccessDecisionPort {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return denyAll();
    }

    const context = raw as Record<string, unknown>;
    const keys = Object.keys(context).sort();
    if (
        keys.length !== 2 ||
        keys[0] !== 'authenticated' ||
        keys[1] !== 'permissions' ||
        context['authenticated'] !== true ||
        !Array.isArray(context['permissions']) ||
        !context['permissions'].every(
            (permission) =>
                typeof permission === 'string' && PERMISSION_ID.test(permission)
        )
    ) {
        return denyAll();
    }

    const permissions = new Set(context['permissions'] as readonly string[]);
    return Object.freeze({
        isAuthenticated: () => true,
        hasPermission: (permission: string) => permissions.has(permission),
    });
}

export const PROOF_ACCESS_DECISION_PROVIDER: Provider = {
    provide: APP_ACCESS_DECISION,
    useFactory: () =>
        createProofAccessDecision(window.__cmzUsersManagementProofAccess),
};
