import type { NewsletterSubscriptionResult } from './models';

export type AfterSuccessContext = {
    readonly operationId: 'subscribe-newsletter';
    readonly output: NewsletterSubscriptionResult;
};

export type AfterSuccessExtension = (
    context: AfterSuccessContext
) => Promise<void>;
