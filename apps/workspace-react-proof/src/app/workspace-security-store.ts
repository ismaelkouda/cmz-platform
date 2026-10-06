export interface WorkspaceSession {
    readonly sessionKey: string;
    readonly subjectKey: string;
}

export interface WorkspaceAccessSnapshot extends WorkspaceSession {
    readonly paths: readonly string[];
}

export function normalizeWorkspaceSession(
    session: WorkspaceSession | null
): WorkspaceSession | null {
    if (
        !session ||
        session.sessionKey.trim().length === 0 ||
        session.subjectKey.trim().length === 0
    ) {
        return null;
    }

    return Object.freeze({
        sessionKey: session.sessionKey,
        subjectKey: session.subjectKey,
    });
}

export function sameWorkspaceSession(
    left: WorkspaceSession | null,
    right: WorkspaceSession | null
): boolean {
    return (
        left?.sessionKey === right?.sessionKey &&
        left?.subjectKey === right?.subjectKey
    );
}

export class WorkspaceSessionStore {
    readonly #listeners = new Set<() => void>();
    #session: WorkspaceSession | null;

    constructor(session: WorkspaceSession | null) {
        this.#session = normalizeWorkspaceSession(session);
    }

    readonly getSnapshot = () => this.#session;

    readonly subscribe = (listener: () => void) => {
        this.#listeners.add(listener);
        return () => this.#listeners.delete(listener);
    };

    replace(session: WorkspaceSession | null): void {
        const next = normalizeWorkspaceSession(session);
        if (sameWorkspaceSession(next, this.#session)) return;

        this.#session = next;
        for (const listener of this.#listeners) listener();
    }
}

export class WorkspaceAccessStore {
    readonly #listeners = new Set<() => void>();
    #snapshot: WorkspaceAccessSnapshot | null;

    constructor(
        session: WorkspaceSession | null,
        paths: readonly string[] | null
    ) {
        this.#snapshot = WorkspaceAccessStore.#normalize(session, paths);
    }

    readonly getSnapshot = () => this.#snapshot;

    readonly subscribe = (listener: () => void) => {
        this.#listeners.add(listener);
        return () => this.#listeners.delete(listener);
    };

    replace(
        session: WorkspaceSession | null,
        paths: readonly string[] | null
    ): void {
        const next = WorkspaceAccessStore.#normalize(session, paths);
        if (!next && !this.#snapshot) return;
        if (
            next &&
            this.#snapshot &&
            sameWorkspaceSession(next, this.#snapshot) &&
            next.paths.length === this.#snapshot.paths.length &&
            next.paths.every(
                (path, index) => path === this.#snapshot?.paths[index]
            )
        ) {
            return;
        }

        this.#snapshot = next;
        for (const listener of this.#listeners) listener();
    }

    static #normalize(
        session: WorkspaceSession | null,
        paths: readonly string[] | null
    ): WorkspaceAccessSnapshot | null {
        const normalizedSession = normalizeWorkspaceSession(session);
        if (!normalizedSession) return null;

        return Object.freeze({
            ...normalizedSession,
            paths: Object.freeze([...new Set(paths ?? [])].sort()),
        });
    }
}
