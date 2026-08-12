import { InjectionToken } from '@angular/core';
import { NotificationPort } from '../ports/notification.port';

/**
 * Jeton d'injection Angular pour `NotificationPort` (ADR-0024).
 *
 * Colocalisé dans `@cmz/shared-application` (pas `@cmz/shared-ui`,
 * contrairement à `CONFIRM_DIALOG_PORT`/`EXCEL_EXPORT_PORT`) : ce port a
 * des consommateurs à la fois dans `type:ui` (composants de page) et dans
 * `type:application` (façades). `type:application` ne peut pas dépendre
 * de `type:ui` (`eslint.config.mjs`) — seule `type:application` elle-même
 * est une couche commune aux deux.
 */
export const NOTIFICATION_PORT = new InjectionToken<NotificationPort>(
    'NotificationPort'
);
