import type {
    SubscribeNewsletterInput,
    NewsletterSubscriptionResult,
} from './models';

// Port (interface pure) — application dépend de ce contrat, jamais de
// l'implémentation concrète (@cmz/newsletter-react-data:ActionRequestClient).
// Pas de DI framework côté React (contrairement à l'équivalent Angular) :
// le port est simplement le type de paramètre attendu par
// createActionRequestHooks(), la valeur concrète étant fournie par l'app
// hôte au point de composition (voir apps/newsletter/src/app/app.tsx).
export interface ActionRequestPort {
    subscribeNewsletter(
        input: SubscribeNewsletterInput
    ): Promise<NewsletterSubscriptionResult>;
}
