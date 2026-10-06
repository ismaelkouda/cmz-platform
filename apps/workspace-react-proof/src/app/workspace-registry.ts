export const DASHBOARD_PATH = '/workspace/dashboard';
export const PROFILE_PATH = '/workspace/profile';

export type WorkspacePath = typeof DASHBOARD_PATH | typeof PROFILE_PATH;

export interface WorkspaceRegistrySnapshot {
    readonly paths: readonly WorkspacePath[];
    readonly dirtyPaths: readonly WorkspacePath[];
    readonly pendingClosePath: WorkspacePath | null;
}

type CloseRequestResult = 'closed' | 'confirmation-required' | 'ignored';

export class WorkspaceRegistry {
    readonly #listeners = new Set<() => void>();
    readonly #activationUrls = new Map<WorkspacePath, string>();
    #snapshot: WorkspaceRegistrySnapshot;

    constructor(initialPath: WorkspacePath, initialUrl: string) {
        this.#snapshot = WorkspaceRegistry.#makeSnapshot(
            initialPath === DASHBOARD_PATH
                ? [DASHBOARD_PATH]
                : [DASHBOARD_PATH, initialPath],
            [],
            null
        );
        this.#activationUrls.set(DASHBOARD_PATH, DASHBOARD_PATH);
        this.#activationUrls.set(initialPath, initialUrl);
    }

    readonly getSnapshot = () => this.#snapshot;

    readonly subscribe = (listener: () => void) => {
        this.#listeners.add(listener);
        return () => this.#listeners.delete(listener);
    };

    recordVisit(path: WorkspacePath, activationUrl: string): void {
        this.#activationUrls.set(path, activationUrl);
        if (!this.#snapshot.paths.includes(path)) {
            this.#replace({ paths: [...this.#snapshot.paths, path] });
        }
    }

    activationUrl(path: WorkspacePath): string {
        return this.#activationUrls.get(path) ?? path;
    }

    setDirty(path: WorkspacePath, dirty: boolean): void {
        if (!this.#snapshot.paths.includes(path)) return;
        const wasDirty = this.#snapshot.dirtyPaths.includes(path);
        if (dirty === wasDirty) return;

        this.#replace({
            dirtyPaths: dirty
                ? [...this.#snapshot.dirtyPaths, path]
                : this.#snapshot.dirtyPaths.filter(
                      (candidate) => candidate !== path
                  ),
        });
    }

    requestClose(path: WorkspacePath): CloseRequestResult {
        if (path === DASHBOARD_PATH || !this.#snapshot.paths.includes(path)) {
            return 'ignored';
        }
        if (this.#snapshot.dirtyPaths.includes(path)) {
            this.#replace({ pendingClosePath: path });
            return 'confirmation-required';
        }
        this.#destroy(path);
        return 'closed';
    }

    cancelClose(): void {
        if (!this.#snapshot.pendingClosePath) return;
        this.#replace({ pendingClosePath: null });
    }

    confirmClose(): WorkspacePath | null {
        const path = this.#snapshot.pendingClosePath;
        if (!path) return null;
        this.#destroy(path);
        return path;
    }

    revoke(paths: readonly WorkspacePath[]): readonly WorkspacePath[] {
        const targets = new Set(paths);
        const revoked = this.#snapshot.paths.filter((path) =>
            targets.has(path)
        );
        if (revoked.length === 0) return revoked;

        for (const path of revoked) this.#activationUrls.delete(path);
        this.#replace({
            paths: this.#snapshot.paths.filter((path) => !targets.has(path)),
            dirtyPaths: this.#snapshot.dirtyPaths.filter(
                (path) => !targets.has(path)
            ),
            pendingClosePath: this.#snapshot.pendingClosePath
                ? targets.has(this.#snapshot.pendingClosePath)
                    ? null
                    : this.#snapshot.pendingClosePath
                : null,
        });
        return revoked;
    }

    #destroy(path: WorkspacePath): void {
        this.#activationUrls.delete(path);
        this.#replace({
            paths: this.#snapshot.paths.filter(
                (candidate) => candidate !== path
            ),
            dirtyPaths: this.#snapshot.dirtyPaths.filter(
                (candidate) => candidate !== path
            ),
            pendingClosePath: null,
        });
    }

    #replace(next: Partial<WorkspaceRegistrySnapshot>): void {
        this.#snapshot = WorkspaceRegistry.#makeSnapshot(
            next.paths ?? this.#snapshot.paths,
            next.dirtyPaths ?? this.#snapshot.dirtyPaths,
            next.pendingClosePath === undefined
                ? this.#snapshot.pendingClosePath
                : next.pendingClosePath
        );
        for (const listener of this.#listeners) listener();
    }

    static #makeSnapshot(
        paths: readonly WorkspacePath[],
        dirtyPaths: readonly WorkspacePath[],
        pendingClosePath: WorkspacePath | null
    ): WorkspaceRegistrySnapshot {
        return Object.freeze({
            paths: Object.freeze([...paths]),
            dirtyPaths: Object.freeze([...dirtyPaths]),
            pendingClosePath,
        });
    }
}
