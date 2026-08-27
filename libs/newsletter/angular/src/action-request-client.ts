import {
    HttpClient,
    HttpContext,
    HttpContextToken,
} from '@angular/common/http';
import { InjectionToken, Service, inject } from '@angular/core';
import { type Observable } from 'rxjs';
import type {
    SubscribeNewsletterInput,
    NewsletterSubscriptionResult,
} from './models';

export const ACTION_REQUEST_BASE_URL = new InjectionToken<string>(
    'ACTION_REQUEST_BASE_URL'
);
export const PUBLIC_REQUEST = new HttpContextToken<boolean>(() => false);

function joinUrl(baseUrl: string, path: string): string {
    return [baseUrl.replace(/\/$/, ''), path.replace(/^\//, '')].join('/');
}

// autoProvided:false — ce service dépend de ACTION_REQUEST_BASE_URL, un token
// sans valeur par défaut qui doit être fourni explicitement par le host (voir
// providers de la route/du composant consommateur). Un root-scope implicite
// masquerait cette dépendance et échouerait au runtime hors du contexte prévu
// (cf. OPS-25bis, docs/architecture — même piège pour un service manuel).
@Service({ autoProvided: false })
export class ActionRequestClient {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(ACTION_REQUEST_BASE_URL);

    subscribeNewsletter(
        input: SubscribeNewsletterInput
    ): Observable<NewsletterSubscriptionResult> {
        return this.http.post<NewsletterSubscriptionResult>(
            joinUrl(this.baseUrl, 'newsletter'),
            input,
            {
                context: new HttpContext().set(PUBLIC_REQUEST, true),
            }
        );
    }
}
