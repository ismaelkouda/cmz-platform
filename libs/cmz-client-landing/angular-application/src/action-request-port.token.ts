import { InjectionToken } from '@angular/core';
import type { ActionRequestPort } from '@cmz/cmz-client-landing-domain';

// Jeton d'injection pour ActionRequestPort (ADR-0024) — colocalisé dans
// application, pas domain, qui ne dépend d'aucun framework. Le composition
// root (type:app) fournit l'implémentation concrète (type:data) via
// useExisting.
export const ACTION_REQUEST_PORT = new InjectionToken<ActionRequestPort>(
    'ActionRequestPort'
);
