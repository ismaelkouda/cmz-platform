export interface SubscribeNewsletterInput {
    readonly email: string;
}

export interface NewsletterSubscriptionResult {
    readonly subscription_id: string;
    readonly message: string;
}
