import type { NewsletterSubscriptionResult } from '@cmz/newsletter-react-domain';

export type AfterSuccessContext = {
    readonly operationId: 'subscribe-newsletter';
    readonly output: NewsletterSubscriptionResult;
};

export type AfterSuccessExtension = (
    context: AfterSuccessContext
) => Promise<void>;
