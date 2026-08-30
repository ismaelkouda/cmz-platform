import { Service, inject } from '@angular/core';
import { from, map, switchMap, type Observable } from 'rxjs';
import { ACTION_REQUEST_PORT } from './action-request-port.token';
import { afterSuccess } from './after-success.extension';
import type {
    SubscribeNewsletterInput,
    NewsletterSubscriptionResult,
} from '@cmz/cmz-client-landing-domain';

// autoProvided:false — dépend de ACTION_REQUEST_PORT, jamais directement de
// type:data (ADR-0003 §4). Voir action-request-port.token.ts.
@Service({ autoProvided: false })
export class ActionRequestCommands {
    private readonly client = inject(ACTION_REQUEST_PORT);

    subscribeNewsletter(
        input: SubscribeNewsletterInput
    ): Observable<NewsletterSubscriptionResult> {
        return this.client
            .subscribeNewsletter(input)
            .pipe(
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
