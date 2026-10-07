import type { ListUsersClient } from './list-users.client';
import type { ListUsersInput, ListUsersPage, UserListItem } from './models';

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

export interface LoadOptions {
    readonly forceRefresh?: boolean;
}

export type ListUsersState =
    'idle' | 'loading' | 'success' | 'empty' | 'error' | 'reloading';

interface QuerySnapshot {
    readonly state: ListUsersState;
    readonly page?: ListUsersPage;
    readonly error?: unknown;
}

export interface ListUsersBinding {
    readonly state: ListUsersState;
    readonly page: ListUsersPage | undefined;
    readonly items: readonly UserListItem[];
    readonly error: unknown;
    readonly load: (
        input: ListUsersInput,
        options?: LoadOptions
    ) => Promise<void>;
    readonly reload: () => Promise<void>;
}

export function createListUsersHooks(
    hooks: ReactHooksPort,
    client: ListUsersClient
) {
    function useListUsers(): ListUsersBinding {
        const [snapshot, setSnapshot] = hooks.useState<QuerySnapshot>({
            state: 'idle',
        });
        const activeRequestRef = hooks.useRef<AbortController | undefined>(
            undefined
        );
        const sequenceRef = hooks.useRef(0);
        const mountedRef = hooks.useRef(false);
        const hasLoadedRef = hooks.useRef(false);
        const inputRef = hooks.useRef<ListUsersInput | undefined>(undefined);

        hooks.useEffect(() => {
            mountedRef.current = true;
            return () => {
                mountedRef.current = false;
                activeRequestRef.current?.abort();
            };
        }, []);

        const execute = hooks.useCallback(
            async (
                input: ListUsersInput,
                nextState: 'loading' | 'reloading',
                isRefresh: boolean
            ): Promise<void> => {
                activeRequestRef.current?.abort();
                const controller = new AbortController();
                activeRequestRef.current = controller;
                const requestId = sequenceRef.current + 1;
                sequenceRef.current = requestId;
                setSnapshot((previous) => ({
                    state: nextState,
                    page: previous.page,
                }));
                try {
                    const page = await client.readAll(input, {
                        isRefresh,
                        signal: controller.signal,
                    });
                    if (
                        !mountedRef.current ||
                        sequenceRef.current !== requestId ||
                        controller.signal.aborted
                    ) {
                        return;
                    }
                    setSnapshot({
                        state: page.items.length === 0 ? 'empty' : 'success',
                        page,
                    });
                } catch (error: unknown) {
                    if (
                        !mountedRef.current ||
                        sequenceRef.current !== requestId ||
                        controller.signal.aborted
                    ) {
                        return;
                    }
                    setSnapshot((previous) => ({
                        state: 'error',
                        page: previous.page,
                        error,
                    }));
                    throw error;
                } finally {
                    if (sequenceRef.current === requestId) {
                        activeRequestRef.current = undefined;
                    }
                }
            },
            [client]
        );

        const load = hooks.useCallback(
            (
                input: ListUsersInput,
                options: LoadOptions = {}
            ): Promise<void> => {
                inputRef.current = input;
                hasLoadedRef.current = true;
                return execute(input, 'loading', options.forceRefresh ?? false);
            },
            [execute]
        );

        const reload = hooks.useCallback(async (): Promise<void> => {
            const input = inputRef.current;
            if (!input) throw new Error('reload requires a previous load');
            return execute(input, 'reloading', true);
        }, [execute]);

        return {
            state: snapshot.state,
            page: snapshot.page,
            items: snapshot.page?.items ?? [],
            error: snapshot.error,
            load,
            reload,
        };
    }

    return { useListUsers };
}
