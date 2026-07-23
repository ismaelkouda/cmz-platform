import {
    ApplicationConfig,
    provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
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
import { provideI18n } from './i18n/i18n.provider';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideHttpClient(),
        provideRouter(appRoutes),
        provideI18n(),
        // Adaptateurs design-system des ports (remplacent Sonner/SweetAlert2).
        { provide: NotificationPort, useExisting: CmzNotificationService },
        { provide: ConfirmDialogPort, useExisting: CmzConfirmDialogService },
        { provide: TranslationPort, useExisting: I18nextTranslationService },
    ],
};
