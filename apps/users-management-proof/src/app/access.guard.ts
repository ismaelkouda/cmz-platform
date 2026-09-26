import { inject, InjectionToken } from '@angular/core';
import { CanActivateFn } from '@angular/router';

export interface AppAccessDecisionPort {
    isAuthenticated(): boolean;
    hasPermission(permission: string): boolean;
}

export interface AppAccessPolicy {
    mode: 'public' | 'authenticated' | 'authorized';
    permissions: readonly string[];
}

declare global {
    interface Window {
        /** Contexte public injecté par le host avant le bootstrap Angular. */
        __cmzAppAccessContext?: unknown;
    }
}

function denyAll(): AppAccessDecisionPort {
    return Object.freeze({
        isAuthenticated: () => false,
        hasPermission: () => false,
    });
}

export function createBrowserAccessDecision(
    raw: unknown
): AppAccessDecisionPort {
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
                typeof permission === 'string' && permission.length > 0
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

export const APP_ACCESS_DECISION = new InjectionToken<AppAccessDecisionPort>(
    'APP_ACCESS_DECISION',
    {
        providedIn: 'root',
        factory: () =>
            createBrowserAccessDecision(window.__cmzAppAccessContext),
    }
);

export function evaluateAppAccess(
    policy: AppAccessPolicy | null | undefined,
    decision: AppAccessDecisionPort | null
): boolean {
    if (!policy || !Array.isArray(policy.permissions)) return false;
    if (policy.mode === 'public') return policy.permissions.length === 0;
    if (!decision?.isAuthenticated()) return false;
    if (policy.mode === 'authenticated') return policy.permissions.length === 0;
    if (policy.mode !== 'authorized') return false;
    if (policy.permissions.length === 0) return false;
    return policy.permissions.every(
        (permission) =>
            permission.length > 0 && decision.hasPermission(permission)
    );
}

export const appAccessGuard: CanActivateFn = (route) =>
    evaluateAppAccess(
        route.data['access'] as AppAccessPolicy,
        inject(APP_ACCESS_DECISION, { optional: true })
    );
