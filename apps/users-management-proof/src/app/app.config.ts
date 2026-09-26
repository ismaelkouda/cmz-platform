import { provideHttpClient } from '@angular/common/http';
import {
    ApplicationConfig,
    isDevMode,
    provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';

import { appRoutes } from './app.routes';
import { PROOF_ACCESS_DECISION_PROVIDER } from './proof-access.adapter';
import { TranslocoHttpLoader } from './transloco-loader';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideHttpClient(),
        provideRouter(appRoutes),
        PROOF_ACCESS_DECISION_PROVIDER,
        provideTransloco({
            config: {
                availableLangs: ['fr'],
                defaultLang: 'fr',
                reRenderOnLangChange: true,
                prodMode: !isDevMode(),
            },
            loader: TranslocoHttpLoader,
        }),
    ],
};
