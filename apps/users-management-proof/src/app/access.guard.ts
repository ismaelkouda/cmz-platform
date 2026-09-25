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

export const APP_ACCESS_DECISION = new InjectionToken<AppAccessDecisionPort>(
    'APP_ACCESS_DECISION'
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
