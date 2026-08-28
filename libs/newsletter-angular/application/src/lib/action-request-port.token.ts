import { InjectionToken } from '@angular/core';
import type { ActionRequestPort } from '@cmz/newsletter-angular-domain';

// Jeton d'injection pour ActionRequestPort (ADR-0024) — colocalisé dans
// application, pas domain, qui ne dépend d'aucun framework. Le composition
// root (app.config.ts, type:app) fournit ActionRequestClient
// (@cmz/newsletter-angular-data) comme implémentation concrète via
// useExisting.
export const ACTION_REQUEST_PORT = new InjectionToken<ActionRequestPort>(
    'ActionRequestPort'
);
