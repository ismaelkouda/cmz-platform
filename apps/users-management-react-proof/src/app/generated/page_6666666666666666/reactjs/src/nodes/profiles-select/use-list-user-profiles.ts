import type { ListUserProfilesClient } from './list-user-profiles.client';
import type { ProfileOption } from './models';

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

export type ListUserProfilesState =
    'idle' | 'loading' | 'success' | 'empty' | 'error' | 'reloading';

interface QuerySnapshot {
    readonly state: ListUserProfilesState;
    readonly items: readonly ProfileOption[];
    readonly error?: unknown;
}

export interface ListUserProfilesBinding {
    readonly state: ListUserProfilesState;
    readonly items: readonly ProfileOption[];
    readonly error: unknown;
    readonly load: (options?: LoadOptions) => Promise<void>;
    readonly reload: () => Promise<void>;
}

export function createListUserProfilesHooks(
    hooks: ReactHooksPort,
    client: ListUserProfilesClient
) {
    function useListUserProfiles(): ListUserProfilesBinding {
        const [snapshot, setSnapshot] = hooks.useState<QuerySnapshot>({
            state: 'idle',
            items: [],
        });
        const activeRequestRef = hooks.useRef<AbortController | undefined>(
            undefined
        );
        const sequenceRef = hooks.useRef(0);
        const mountedRef = hooks.useRef(false);
        const hasLoadedRef = hooks.useRef(false);

        hooks.useEffect(() => {
            mountedRef.current = true;
            return () => {
                mountedRef.current = false;
                activeRequestRef.current?.abort();
            };
        }, []);

        const execute = hooks.useCallback(
            async (
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
                    items: previous.items,
                }));
                try {
                    const items = await client.readAll({
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
                        state: items.length === 0 ? 'empty' : 'success',
                        items,
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
                        items: previous.items,
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
            (options: LoadOptions = {}): Promise<void> => {
                hasLoadedRef.current = true;
                return execute('loading', options.forceRefresh ?? false);
            },
            [execute]
        );

        const reload = hooks.useCallback(async (): Promise<void> => {
            if (!hasLoadedRef.current) {
                throw new Error('reload requires a previous load');
            }
            return execute('reloading', true);
        }, [execute]);

        return {
            state: snapshot.state,
            items: snapshot.items,
            error: snapshot.error,
            load,
            reload,
        };
    }

    return { useListUserProfiles };
}
