import type { Observable } from 'rxjs';
import type {
    SubscribeNewsletterInput,
    NewsletterSubscriptionResult,
} from './models';

// Port (interface pure, 0 import framework) — application dépend de ce
// contrat, jamais de l'implémentation concrète
// (@cmz/newsletter-angular-data:ActionRequestClient). Le jeton d'injection
// vit dans @cmz/newsletter-angular-application (ADR-0024, même pattern que
// NavigationPort/StoragePort/NotificationPort dans shared-domain/shared-application) :
// colocalisé avec sa première lib consommatrice plutôt que dans domain, qui
// ne dépend d'aucun framework.
export interface ActionRequestPort {
    subscribeNewsletter(
        input: SubscribeNewsletterInput
    ): Observable<NewsletterSubscriptionResult>;
}
