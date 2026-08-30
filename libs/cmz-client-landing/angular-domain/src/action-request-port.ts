import type { Observable } from 'rxjs';
import type {
    SubscribeNewsletterInput,
    NewsletterSubscriptionResult,
} from './models';

// Port (interface pure, 0 import framework) — application dépend de ce
// contrat, jamais de l'implémentation concrète (data). Généré depuis le
// même modèle sémantique que l'implémentation data — voir
// renderClientImplementation dans ce fichier.
export interface ActionRequestPort {
    subscribeNewsletter(
        input: SubscribeNewsletterInput
    ): Observable<NewsletterSubscriptionResult>;
}
