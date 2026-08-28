import {
    ApplicationConfig,
    isDevMode,
    provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import {
    ACTION_REQUEST_BASE_URL,
    ActionRequestClient,
} from '@cmz/newsletter-angular-data';
import {
    ACTION_REQUEST_PORT,
    ActionRequestCommands,
} from '@cmz/newsletter-angular-application';
import { appRoutes } from './app.routes';
import { TranslocoHttpLoader } from './transloco-loader';

// Cas de test : générateur + mock local, pas de vrai backend.
// Voir apps/newsletter-test/src/mock/newsletter-mock-server.mjs.
const NEWSLETTER_MOCK_BASE_URL = 'http://localhost:4310';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideRouter(appRoutes),
        provideHttpClient(),
        {
            provide: ACTION_REQUEST_BASE_URL,
            useValue: NEWSLETTER_MOCK_BASE_URL,
        },
        ActionRequestClient,
        // Composition root : lie le port abstrait (application) à
        // l'implémentation concrète (data) — application ne connaît que
        // ACTION_REQUEST_PORT (ADR-0003 §4 / ADR-0024).
        { provide: ACTION_REQUEST_PORT, useExisting: ActionRequestClient },
        ActionRequestCommands,
        provideTransloco({
            config: {
                availableLangs: ['fr', 'en'],
                defaultLang: 'fr',
                reRenderOnLangChange: true,
                prodMode: !isDevMode(),
            },
            loader: TranslocoHttpLoader,
        }),
    ],
};
