import type {
    ActionRequestPort,
    SubscribeNewsletterInput,
    NewsletterSubscriptionResult,
} from '@cmz/newsletter-react-domain';

export interface FetchResponse {
    readonly ok: boolean;
    readonly status: number;
    json(): Promise<unknown>;
}

export type RequestAuthentication =
    'none' | 'bearer' | 'session' | 'api_key' | 'other';

export type FetchPort = (
    url: string,
    init: {
        readonly method: string;
        readonly authentication: RequestAuthentication;
        readonly headers: Readonly<Record<string, string>>;
        readonly body: string;
    }
) => Promise<FetchResponse>;

function joinUrl(baseUrl: string, path: string): string {
    return [baseUrl.replace(/\/$/, ''), path.replace(/^\//, '')].join('/');
}

export class ActionRequestClient implements ActionRequestPort {
    constructor(
        private readonly baseUrl: string,
        private readonly fetch: FetchPort
    ) {}

    subscribeNewsletter(
        input: SubscribeNewsletterInput
    ): Promise<NewsletterSubscriptionResult> {
        return this.request<NewsletterSubscriptionResult>(
            'newsletter',
            'POST',
            'none',
            input,
            false
        );
    }

    private async request<T>(
        path: string,
        method: string,
        authentication: RequestAuthentication,
        input: unknown,
        isEnveloped: boolean
    ): Promise<T> {
        const response = await this.fetch(joinUrl(this.baseUrl, path), {
            method,
            authentication,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(input),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as T;
    }
}
