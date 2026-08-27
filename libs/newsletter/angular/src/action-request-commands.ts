import { InjectionToken, Service, inject } from '@angular/core';
import { from, map, switchMap, type Observable } from 'rxjs';
import { ActionRequestClient } from './action-request-client';
import { afterSuccess } from './after-success.extension';
import type {
    SubscribeNewsletterInput,
    NewsletterSubscriptionResult,
} from './models';

// autoProvided:false — dépend de ActionRequestClient, lui-même scopé au host
// (voir action-request-client.ts). La chaîne complète doit être fournie
// explicitement dans les providers du composant/route consommateur.
@Service({ autoProvided: false })
export class ActionRequestCommands {
    private readonly client = inject(ActionRequestClient);

    subscribeNewsletter(
        input: SubscribeNewsletterInput
    ): Observable<NewsletterSubscriptionResult> {
        return this.client.subscribeNewsletter(input).pipe(
            switchMap((result) =>
                from(
                    afterSuccess({
                        operationId: 'subscribe-newsletter',
                        output: result,
                    })
                ).pipe(map(() => result))
            )
        );
    }
}
