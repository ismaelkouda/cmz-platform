import type { CreateUserClient } from './create-user.client';
import type { CreateUserInput, CreateUserResult } from './models';

export type StateSetter<T> = (value: T | ((previous: T) => T)) => void;

export interface ReactHooksPort {
    useState<T>(initial: T): readonly [T, StateSetter<T>];
    useRef<T>(initial: T): { current: T };
    useEffect(
        effect: () => void | (() => void),
        dependencies: readonly unknown[]
    ): void;
    useCallback<TArguments extends unknown[], TResult>(
        callback: (...arguments_: TArguments) => TResult,
        dependencies: readonly unknown[]
    ): (...arguments_: TArguments) => TResult;
}

export type CreateUserState =
    | 'idle'
    | 'submitting'
    | 'applying-post-success'
    | 'success'
    | 'error'
    | 'committed-with-local-error';

interface ActionSnapshot {
    readonly state: CreateUserState;
    readonly result?: CreateUserResult;
    readonly error?: unknown;
}

export interface CreateUserBinding {
    readonly state: CreateUserState;
    readonly result: CreateUserResult | undefined;
    readonly error: unknown;
    readonly submit: (input: CreateUserInput) => Promise<CreateUserResult>;
}

export class ActionRequestPendingError extends Error {
    readonly code = 'ACTION_REQUEST_PENDING';

    constructor() {
        super('Action request is already pending');
        this.name = 'ActionRequestPendingError';
    }
}

export function createCreateUserHooks(
    hooks: ReactHooksPort,
    client: CreateUserClient
) {
    function useCreateUser(): CreateUserBinding {
        const [snapshot, setSnapshot] = hooks.useState<ActionSnapshot>({
            state: 'idle',
        });
        const mountedRef = hooks.useRef(false);
        const pendingRef = hooks.useRef(false);

        hooks.useEffect(() => {
            mountedRef.current = true;
            return () => {
                mountedRef.current = false;
            };
        }, []);

        const submit = hooks.useCallback(
            async (input: CreateUserInput): Promise<CreateUserResult> => {
                if (pendingRef.current) {
                    throw new ActionRequestPendingError();
                }
                pendingRef.current = true;
                if (mountedRef.current) {
                    setSnapshot({ state: 'submitting' });
                }
                try {
                    const result = await client.execute(input);
                    if (mountedRef.current) {
                        setSnapshot({ state: 'success', result });
                    }
                    return result;
                } catch (error: unknown) {
                    if (mountedRef.current) {
                        setSnapshot({ state: 'error', error });
                    }
                    throw error;
                } finally {
                    pendingRef.current = false;
                }
            },
            [client]
        );

        return {
            state: snapshot.state,
            result: snapshot.result,
            error: snapshot.error,
            submit,
        };
    }

    return { useCreateUser };
}
