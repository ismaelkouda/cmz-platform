import {
    ApplicationConfig,
    provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import {
    ACTION_REQUEST_BASE_URL,
    ActionRequestClient,
    ActionRequestCommands,
} from '@cmz/newsletter-angular';
import { appRoutes } from './app.routes';

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
        ActionRequestCommands,
    ],
};
