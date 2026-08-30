import type { NewsletterSubscriptionResult } from '@cmz/cmz-client-landing-domain';

export type AfterSuccessContext = {
    readonly operationId: 'subscribe-newsletter';
    readonly output: NewsletterSubscriptionResult;
};

export type AfterSuccessExtension = (
    context: AfterSuccessContext
) => Promise<void>;
