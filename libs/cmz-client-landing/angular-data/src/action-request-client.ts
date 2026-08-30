import {
    HttpClient,
    HttpContext,
    HttpContextToken,
} from '@angular/common/http';
import { InjectionToken, Service, inject } from '@angular/core';
import { type Observable } from 'rxjs';
import type { ActionRequestPort } from '@cmz/cmz-client-landing-domain';
import type {
    SubscribeNewsletterInput,
    NewsletterSubscriptionResult,
} from '@cmz/cmz-client-landing-domain';

export const ACTION_REQUEST_BASE_URL = new InjectionToken<string>(
    'ACTION_REQUEST_BASE_URL'
);
export const PUBLIC_REQUEST = new HttpContextToken<boolean>(() => false);

function joinUrl(baseUrl: string, path: string): string {
    return [baseUrl.replace(/\/$/, ''), path.replace(/^\//, '')].join('/');
}

// autoProvided:false — dépend de ACTION_REQUEST_BASE_URL, un token sans
// valeur par défaut fourni par le composition root (type:app).
@Service({ autoProvided: false })
export class ActionRequestClient implements ActionRequestPort {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(ACTION_REQUEST_BASE_URL);

    subscribeNewsletter(
        input: SubscribeNewsletterInput
    ): Observable<NewsletterSubscriptionResult> {
        return this.http.post<NewsletterSubscriptionResult>(
            joinUrl(this.baseUrl, 'newsletter/subscribe'),
            input,
            {
                context: new HttpContext().set(PUBLIC_REQUEST, true),
            }
        );
    }
}
