import type { ActionRequestClient } from './action-request-client';
import type {
    SubscribeNewsletterInput,
    NewsletterSubscriptionResult,
} from './models';

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

export function createActionRequestHooks(
    hooks: ReactHooksPort,
    client: ActionRequestClient
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
