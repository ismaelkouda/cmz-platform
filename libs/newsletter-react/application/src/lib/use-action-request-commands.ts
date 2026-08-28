import type {
    ActionRequestPort,
    SubscribeNewsletterInput,
    NewsletterSubscriptionResult,
} from '@cmz/newsletter-react-domain';

export type StateSetter<T> = (value: T) => void;

export interface ReactHooksPort {
    useState<T>(initial: T): readonly [T, StateSetter<T>];
    useCallback<TArguments extends unknown[], TResult>(
        callback: (...arguments_: TArguments) => TResult,
        dependencies: readonly unknown[]
    ): (...arguments_: TArguments) => TResult;
}

import { afterSuccess } from './after-success.extension';

export type CommandState<T> =
    | { readonly status: 'idle' }
    | { readonly status: 'pending' }
    | { readonly status: 'success'; readonly value: T }
    | { readonly status: 'error'; readonly error: unknown };

export interface CommandBinding<TInput, TOutput> {
    readonly state: CommandState<TOutput>;
    readonly execute: (input: TInput) => Promise<TOutput>;
}

// client : ACTION_REQUEST_PORT — l'application ne dépend que du contrat
// (ADR-0003 §4), jamais de @cmz/newsletter-react-data directement. L'app
// hôte instancie ActionRequestClient (qui implémente ActionRequestPort) et
// le passe ici au point de composition.
export function createActionRequestHooks(
    hooks: ReactHooksPort,
    client: ActionRequestPort
) {
    function useSubscribeNewsletter(): CommandBinding<
        SubscribeNewsletterInput,
        NewsletterSubscriptionResult
    > {
        const [state, setState] = hooks.useState<
            CommandState<NewsletterSubscriptionResult>
        >({ status: 'idle' });
        const execute = hooks.useCallback(
            async (input: SubscribeNewsletterInput) => {
                setState({ status: 'pending' });
                try {
                    const result = await client.subscribeNewsletter(input);
                    await afterSuccess({
                        operationId: 'subscribe-newsletter',
                        output: result,
                    });
                    setState({ status: 'success', value: result });
                    return result;
                } catch (error: unknown) {
                    setState({ status: 'error', error });
                    throw error;
                }
            },
            [client]
        );
        return { state, execute };
    }

    return { useSubscribeNewsletter };
}
