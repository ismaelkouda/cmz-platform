import {
    ApplicationConfig,
    provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
    ConfirmDialogPort,
    NotificationPort,
    TranslationPort,
} from '@cmz/shared-application';
import {
    CmzConfirmDialogService,
    CmzNotificationService,
    I18nextTranslationService,
} from '@cmz/shared-ui';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideRouter(appRoutes),
        // Adaptateurs design-system des ports (remplacent Sonner/SweetAlert2).
        { provide: NotificationPort, useExisting: CmzNotificationService },
        { provide: ConfirmDialogPort, useExisting: CmzConfirmDialogService },
        { provide: TranslationPort, useExisting: I18nextTranslationService },
    ],
};
