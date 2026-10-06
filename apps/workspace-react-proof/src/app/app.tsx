import {
    Activity,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';

import './app.scss';
import {
    sameWorkspaceSession,
    WorkspaceAccessStore,
    WorkspaceSessionStore,
} from './workspace-security-store';
import type { WorkspaceSession } from './workspace-security-store';

const DASHBOARD_PATH = '/workspace/dashboard';
const PROFILE_PATH = '/workspace/profile';
const SIGNED_OUT_PATH = '/signed-out';

type WorkspacePath = typeof DASHBOARD_PATH | typeof PROFILE_PATH;

interface WorkspaceView {
    path: WorkspacePath;
    title: string;
    pinned: boolean;
    accessPath: string | null;
}

interface ProfileSummary {
    name: string;
    role: string;
}

const VIEW_CATALOG: Readonly<Record<WorkspacePath, WorkspaceView>> = {
    [DASHBOARD_PATH]: {
        path: DASHBOARD_PATH,
        title: 'Tableau de bord',
        pinned: true,
        accessPath: null,
    },
    [PROFILE_PATH]: {
        path: PROFILE_PATH,
        title: 'Profil',
        pinned: false,
        accessPath: PROFILE_PATH,
    },
};

const DEFAULT_SESSION: WorkspaceSession = Object.freeze({
    sessionKey: 'proof-session-a',
    subjectKey: 'proof-user-a',
});
const EMPTY_ACCESS_PATHS: readonly string[] = Object.freeze([]);

class WorkspaceRegistry {
    readonly #listeners = new Set<() => void>();
    readonly #activationUrls = new Map<WorkspacePath, string>();
    #paths: readonly WorkspacePath[];

    constructor(initialPath: WorkspacePath, initialUrl: string) {
        this.#paths =
            initialPath === DASHBOARD_PATH
                ? [DASHBOARD_PATH]
                : [DASHBOARD_PATH, initialPath];
        this.#activationUrls.set(DASHBOARD_PATH, DASHBOARD_PATH);
        this.#activationUrls.set(initialPath, initialUrl);
    }

    readonly getSnapshot = () => this.#paths;

    readonly subscribe = (listener: () => void) => {
        this.#listeners.add(listener);
        return () => this.#listeners.delete(listener);
    };

    recordVisit(path: WorkspacePath, activationUrl: string): void {
        this.#activationUrls.set(path, activationUrl);
        if (!this.#paths.includes(path)) {
            this.#paths = [...this.#paths, path];
            this.#emit();
        }
    }

    activationUrl(path: WorkspacePath): string {
        return this.#activationUrls.get(path) ?? path;
    }

    close(path: WorkspacePath): void {
        if (VIEW_CATALOG[path].pinned || !this.#paths.includes(path)) return;
        this.#paths = this.#paths.filter((candidate) => candidate !== path);
        this.#activationUrls.delete(path);
        this.#emit();
    }

    revoke(paths: readonly WorkspacePath[]): readonly WorkspacePath[] {
        const targets = new Set(paths);
        const revoked = this.#paths.filter((path) => targets.has(path));
        if (revoked.length === 0) return revoked;

        this.#paths = this.#paths.filter((path) => !targets.has(path));
        for (const path of revoked) this.#activationUrls.delete(path);
        this.#emit();
        return revoked;
    }

    #emit(): void {
        for (const listener of this.#listeners) listener();
    }
}

function isWorkspacePath(pathname: string): pathname is WorkspacePath {
    return pathname === DASHBOARD_PATH || pathname === PROFILE_PATH;
}

function normalizePath(pathname: string): WorkspacePath {
    return isWorkspacePath(pathname) ? pathname : DASHBOARD_PATH;
}

function workspaceActivationUrl(
    pathname: WorkspacePath,
    search: string,
    hash: string
): string {
    return `${pathname}${search}${hash}`;
}

function canAccess(
    path: WorkspacePath,
    allowedAccessPaths: readonly string[]
): boolean {
    const { accessPath } = VIEW_CATALOG[path];
    return accessPath === null || allowedAccessPaths.includes(accessPath);
}

function tabId(path: WorkspacePath): string {
    return `workspace-tab-${path.slice(1).replaceAll('/', '-')}`;
}

function panelId(path: WorkspacePath): string {
    return `workspace-panel-${path.slice(1).replaceAll('/', '-')}`;
}

function DashboardView({
    canOpenProfile,
    onOpenProfile,
}: {
    canOpenProfile: boolean;
    onOpenProfile: () => void;
}) {
    const [count, setCount] = useState(0);
    const [instanceId] = useState(() => crypto.randomUUID());

    return (
        <article className="proof-card" data-dashboard-instance-id={instanceId}>
            <p className="proof-eyebrow">Vue épinglée</p>
            <h2>Tableau de bord</h2>
            <p>
                Cette application borne le cycle de vie des vues React sans
                reproduire le cache de composants Angular.
            </p>
            <div className="proof-actions">
                <button
                    type="button"
                    onClick={() => setCount((value) => value + 1)}
                >
                    Compteur local : {count}
                </button>
                {canOpenProfile ? (
                    <button type="button" onClick={onOpenProfile}>
                        Ouvrir le profil
                    </button>
                ) : null}
            </div>
        </article>
    );
}

function ProfileView({
    loadProfile,
}: {
    loadProfile: () => Promise<ProfileSummary>;
}) {
    const [instanceId] = useState(() => crypto.randomUUID());
    const [profile, setProfile] = useState<ProfileSummary | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        void loadProfile()
            .then((value) => {
                if (active) setProfile(value);
            })
            .catch(() => {
                if (active) setError('Le profil ne peut pas être chargé.');
            });

        return () => {
            active = false;
        };
    }, [loadProfile]);

    return (
        <article className="proof-card" data-instance-id={instanceId}>
            <p className="proof-eyebrow">Vue fermable</p>
            <h2>Profil utilisateur</h2>
            {error ? <p role="alert">{error}</p> : null}
            {!profile && !error ? (
                <p role="status">Chargement du profil…</p>
            ) : null}
            {profile ? (
                <dl className="profile-summary">
                    <div>
                        <dt>Nom</dt>
                        <dd>{profile.name}</dd>
                    </div>
                    <div>
                        <dt>Rôle</dt>
                        <dd>{profile.role}</dd>
                    </div>
                </dl>
            ) : null}
            <label className="proof-field">
                Note locale non enregistrée
                <input name="profile-note" placeholder="Saisir une note" />
            </label>
        </article>
    );
}

function WorkspacePanel({
    view,
    activePath,
    children,
}: {
    view: WorkspaceView;
    activePath: WorkspacePath;
    children: ReactNode;
}) {
    const isActive = view.path === activePath;

    return (
        <Activity mode={isActive ? 'visible' : 'hidden'}>
            <section
                id={panelId(view.path)}
                className="workspace-panel"
                role="tabpanel"
                aria-labelledby={tabId(view.path)}
                aria-hidden={!isActive}
            >
                {children}
            </section>
        </Activity>
    );
}

interface AppProps {
    accessStore?: WorkspaceAccessStore;
    sessionStore?: WorkspaceSessionStore;
}

interface ProfileRequest {
    controller: AbortController;
    promise: Promise<ProfileSummary>;
}

interface WorkspaceRuntimeProps {
    accessStore: WorkspaceAccessStore;
    session: WorkspaceSession;
    onEndSession: () => void;
    onReplaceSession: () => void;
}

function WorkspaceRuntime({
    accessStore,
    session,
    onEndSession,
    onReplaceSession,
}: WorkspaceRuntimeProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const requestedPath = normalizePath(location.pathname);
    const accessSnapshot = useSyncExternalStore(
        accessStore.subscribe,
        accessStore.getSnapshot,
        accessStore.getSnapshot
    );
    const allowedAccessPaths = sameWorkspaceSession(accessSnapshot, session)
        ? (accessSnapshot?.paths ?? EMPTY_ACCESS_PATHS)
        : EMPTY_ACCESS_PATHS;
    const requestedPathAllowed = canAccess(requestedPath, allowedAccessPaths);
    const activePath = requestedPathAllowed ? requestedPath : DASHBOARD_PATH;
    const [registry] = useState(
        () =>
            new WorkspaceRegistry(
                activePath,
                isWorkspacePath(location.pathname) && requestedPathAllowed
                    ? workspaceActivationUrl(
                          location.pathname,
                          location.search,
                          location.hash
                      )
                    : DASHBOARD_PATH
            )
    );
    const openPaths = useSyncExternalStore(
        registry.subscribe,
        registry.getSnapshot,
        registry.getSnapshot
    );
    const profileCache = useRef<ProfileSummary | null>(null);
    const profileRequest = useRef<ProfileRequest | null>(null);

    const clearProfileRuntime = useCallback(() => {
        profileRequest.current?.controller.abort();
        profileRequest.current = null;
        profileCache.current = null;
    }, []);

    useEffect(() => clearProfileRuntime, [clearProfileRuntime]);

    useEffect(() => {
        const currentPath = location.pathname;
        if (!isWorkspacePath(currentPath)) {
            void navigate(DASHBOARD_PATH, { replace: true });
            return;
        }

        if (!canAccess(currentPath, allowedAccessPaths)) {
            registry.revoke([currentPath]);
            void navigate(DASHBOARD_PATH, { replace: true });
            return;
        }

        registry.recordVisit(
            currentPath,
            workspaceActivationUrl(currentPath, location.search, location.hash)
        );
    }, [
        allowedAccessPaths,
        location.hash,
        location.pathname,
        location.search,
        navigate,
        registry,
    ]);

    useEffect(() => {
        if (!canAccess(PROFILE_PATH, allowedAccessPaths)) {
            clearProfileRuntime();
        }
        registry.revoke(
            registry
                .getSnapshot()
                .filter((path) => !canAccess(path, allowedAccessPaths))
        );
    }, [allowedAccessPaths, clearProfileRuntime, registry]);

    const loadProfile = useMemo(
        () => async (): Promise<ProfileSummary> => {
            if (profileCache.current) return profileCache.current;
            if (profileRequest.current) return profileRequest.current.promise;

            const controller = new AbortController();
            const request = fetch('/api/workspace/profile', {
                signal: controller.signal,
            })
                .then(async (response) => {
                    if (!response.ok)
                        throw new Error(`HTTP ${response.status}`);
                    return (await response.json()) as ProfileSummary;
                })
                .then((profile) => {
                    if (profileRequest.current?.promise === request) {
                        profileCache.current = profile;
                    }
                    return profile;
                })
                .finally(() => {
                    if (profileRequest.current?.promise === request) {
                        profileRequest.current = null;
                    }
                });

            profileRequest.current = { controller, promise: request };

            return request;
        },
        []
    );

    const activate = (path: WorkspacePath) => {
        if (!canAccess(path, allowedAccessPaths)) {
            const revoked = registry.revoke([path]);
            if (revoked.includes(PROFILE_PATH)) clearProfileRuntime();
            if (requestedPath === path) {
                void navigate(DASHBOARD_PATH, { replace: true });
            }
            return;
        }

        const targetUrl = registry.activationUrl(path);
        registry.recordVisit(path, targetUrl);
        void navigate(targetUrl);
    };

    const renderedPaths = openPaths.filter((path) =>
        canAccess(path, allowedAccessPaths)
    );
    const profileAllowed = canAccess(PROFILE_PATH, allowedAccessPaths);

    const close = (path: WorkspacePath) => {
        if (VIEW_CATALOG[path].pinned) return;

        registry.close(path);
        if (requestedPath === path) {
            void navigate(DASHBOARD_PATH, { replace: true });
        }
    };

    const moveFocus = (
        event: KeyboardEvent<HTMLButtonElement>,
        index: number
    ) => {
        let nextIndex: number | null = null;
        if (event.key === 'ArrowRight')
            nextIndex = (index + 1) % renderedPaths.length;
        if (event.key === 'ArrowLeft') {
            nextIndex =
                (index - 1 + renderedPaths.length) % renderedPaths.length;
        }
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = renderedPaths.length - 1;
        if (
            event.key === 'Delete' &&
            !VIEW_CATALOG[renderedPaths[index]].pinned
        ) {
            event.preventDefault();
            close(renderedPaths[index]);
            return;
        }
        if (nextIndex === null) return;

        event.preventDefault();
        document.getElementById(tabId(renderedPaths[nextIndex]))?.focus();
    };

    return (
        <main className="proof-shell">
            <header className="proof-header">
                <p className="proof-eyebrow">Preuve exécutable React 19.3</p>
                <h1>Workspace à vues vivantes</h1>
                <p>
                    Routeur réel, frontières Activity stables et politique de
                    données explicite.
                </p>
                {profileAllowed ? (
                    <button
                        type="button"
                        onClick={() => accessStore.replace(session, [])}
                    >
                        Révoquer l’accès au profil
                    </button>
                ) : (
                    <p role="status">Accès au profil révoqué.</p>
                )}
                <div className="proof-actions">
                    <button type="button" onClick={onReplaceSession}>
                        Remplacer la session
                    </button>
                    <button type="button" onClick={onEndSession}>
                        Terminer la session
                    </button>
                </div>
            </header>

            <div
                className="workspace-tabs"
                role="tablist"
                aria-label="Vues ouvertes"
            >
                {renderedPaths.map((path, index) => {
                    const view = VIEW_CATALOG[path];
                    const selected = activePath === path;
                    return (
                        <div className="workspace-tab-item" key={path}>
                            <button
                                id={tabId(path)}
                                className="workspace-tab"
                                type="button"
                                role="tab"
                                aria-controls={panelId(path)}
                                aria-selected={selected}
                                tabIndex={selected ? 0 : -1}
                                onClick={() => activate(path)}
                                onKeyDown={(event) => moveFocus(event, index)}
                            >
                                {view.title}
                            </button>
                            {!view.pinned ? (
                                <button
                                    className="workspace-close"
                                    type="button"
                                    aria-label={`Fermer ${view.title}`}
                                    onClick={() => close(path)}
                                >
                                    ×
                                </button>
                            ) : null}
                        </div>
                    );
                })}
            </div>

            {renderedPaths.map((path) => {
                const view = VIEW_CATALOG[path];
                return (
                    <WorkspacePanel
                        key={path}
                        view={view}
                        activePath={activePath}
                    >
                        {path === DASHBOARD_PATH ? (
                            <DashboardView
                                canOpenProfile={profileAllowed}
                                onOpenProfile={() => activate(PROFILE_PATH)}
                            />
                        ) : (
                            <ProfileView loadProfile={loadProfile} />
                        )}
                    </WorkspacePanel>
                );
            })}
        </main>
    );
}

function App({ accessStore, sessionStore }: AppProps = {}) {
    const location = useLocation();
    const navigate = useNavigate();
    const [stores] = useState(() => {
        const session =
            sessionStore ?? new WorkspaceSessionStore(DEFAULT_SESSION);
        return {
            session,
            access:
                accessStore ??
                new WorkspaceAccessStore(session.getSnapshot(), [PROFILE_PATH]),
        };
    });
    const session = useSyncExternalStore(
        stores.session.subscribe,
        stores.session.getSnapshot,
        stores.session.getSnapshot
    );

    useEffect(() => {
        if (!session && location.pathname !== SIGNED_OUT_PATH) {
            void navigate(SIGNED_OUT_PATH, { replace: true });
        }
    }, [location.pathname, navigate, session]);

    if (!session) {
        return (
            <main className="proof-shell">
                <section
                    className="proof-card"
                    aria-labelledby="signed-out-title"
                >
                    <p className="proof-eyebrow">Session terminée</p>
                    <h1 id="signed-out-title">Vous êtes déconnecté</h1>
                    <p role="status">
                        Toutes les vues et données du workspace ont été
                        détruites.
                    </p>
                </section>
            </main>
        );
    }

    const replaceSession = () => {
        const nextSession: WorkspaceSession = {
            sessionKey: crypto.randomUUID(),
            subjectKey:
                session.subjectKey === 'proof-user-a'
                    ? 'proof-user-b'
                    : 'proof-user-a',
        };
        stores.access.replace(nextSession, [PROFILE_PATH]);
        stores.session.replace(nextSession);
    };

    return (
        <WorkspaceRuntime
            key={`${session.sessionKey}:${session.subjectKey}`}
            accessStore={stores.access}
            session={session}
            onEndSession={() => stores.session.replace(null)}
            onReplaceSession={replaceSession}
        />
    );
}

export default App;
