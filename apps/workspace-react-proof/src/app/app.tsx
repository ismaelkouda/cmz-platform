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
import {
    DASHBOARD_PATH,
    PROFILE_PATH,
    PROFILED_WORKSPACE_CAPACITY,
    WorkspaceRegistry,
} from './workspace-registry';
import type { WorkspacePath } from './workspace-registry';

const SIGNED_OUT_PATH = '/signed-out';

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

function dirtyDescriptionId(path: WorkspacePath): string {
    return `workspace-dirty-${path.slice(1).replaceAll('/', '-')}`;
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
    onDirtyChange,
}: {
    loadProfile: () => Promise<ProfileSummary>;
    onDirtyChange: (dirty: boolean) => void;
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
                <input
                    name="profile-note"
                    placeholder="Saisir une note"
                    onChange={(event) =>
                        onDirtyChange(event.currentTarget.value.length > 0)
                    }
                />
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
    maxOpenViews?: number;
}

interface ProfileRequest {
    controller: AbortController;
    promise: Promise<ProfileSummary>;
}

interface WorkspaceNavigationState {
    workspaceCapacityReached: true;
}

function hasCapacityNotice(state: unknown): state is WorkspaceNavigationState {
    return (
        typeof state === 'object' &&
        state !== null &&
        'workspaceCapacityReached' in state &&
        state.workspaceCapacityReached === true
    );
}

interface WorkspaceRuntimeProps {
    accessStore: WorkspaceAccessStore;
    session: WorkspaceSession;
    maxOpenViews: number;
    onEndSession: () => void;
    onReplaceSession: () => void;
}

function WorkspaceRuntime({
    accessStore,
    session,
    maxOpenViews,
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
    const initialPath = requestedPathAllowed ? requestedPath : DASHBOARD_PATH;
    const [registry] = useState(
        () =>
            new WorkspaceRegistry(
                initialPath,
                isWorkspacePath(location.pathname) && requestedPathAllowed
                    ? workspaceActivationUrl(
                          location.pathname,
                          location.search,
                          location.hash
                      )
                    : DASHBOARD_PATH,
                maxOpenViews
            )
    );
    const workspace = useSyncExternalStore(
        registry.subscribe,
        registry.getSnapshot,
        registry.getSnapshot
    );
    const openPaths = workspace.paths;
    const activePath =
        requestedPathAllowed && openPaths.includes(requestedPath)
            ? requestedPath
            : DASHBOARD_PATH;
    const hasDirtyView = workspace.dirtyPaths.length > 0;
    const capacityReached = hasCapacityNotice(location.state);
    const closeDialog = useRef<HTMLDialogElement | null>(null);
    const profileCache = useRef<ProfileSummary | null>(null);
    const profileRequest = useRef<ProfileRequest | null>(null);

    const clearProfileRuntime = useCallback(() => {
        profileRequest.current?.controller.abort();
        profileRequest.current = null;
        profileCache.current = null;
    }, []);

    useEffect(() => clearProfileRuntime, [clearProfileRuntime]);

    useEffect(() => {
        const dialog = closeDialog.current;
        if (!dialog) return;

        if (workspace.pendingClosePath && !dialog.open) {
            dialog.showModal();
        } else if (!workspace.pendingClosePath && dialog.open) {
            dialog.close();
        }
    }, [workspace.pendingClosePath]);

    useEffect(() => {
        if (!hasDirtyView) return;

        const preventUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = true;
        };
        window.addEventListener('beforeunload', preventUnload);
        return () => window.removeEventListener('beforeunload', preventUnload);
    }, [hasDirtyView]);

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

        const visit = registry.recordVisit(
            currentPath,
            workspaceActivationUrl(currentPath, location.search, location.hash)
        );
        if (visit === 'capacity-reached') {
            void navigate(DASHBOARD_PATH, {
                replace: true,
                state: { workspaceCapacityReached: true },
            });
        }
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
                .paths.filter((path) => !canAccess(path, allowedAccessPaths))
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
        if (registry.recordVisit(path, targetUrl) === 'capacity-reached') {
            void navigate(
                {
                    pathname: location.pathname,
                    search: location.search,
                    hash: location.hash,
                },
                {
                    replace: true,
                    state: { workspaceCapacityReached: true },
                }
            );
            return;
        }
        void navigate(targetUrl);
    };

    const dismissCapacityNotice = () => {
        void navigate(
            {
                pathname: location.pathname,
                search: location.search,
                hash: location.hash,
            },
            { replace: true, state: null }
        );
    };

    const renderedPaths = openPaths.filter((path) =>
        canAccess(path, allowedAccessPaths)
    );
    const profileAllowed = canAccess(PROFILE_PATH, allowedAccessPaths);

    const finishClose = (path: WorkspacePath, previousIndex: number) => {
        const remainingPaths = registry.getSnapshot().paths;
        const focusPath =
            remainingPaths[Math.min(previousIndex, remainingPaths.length - 1)];
        if (VIEW_CATALOG[path].pinned) return;
        if (requestedPath === path) {
            void navigate(DASHBOARD_PATH, { replace: true });
        }
        if (focusPath) {
            setTimeout(() =>
                document.getElementById(tabId(focusPath))?.focus()
            );
        }
    };

    const requestClose = (path: WorkspacePath) => {
        const previousIndex = renderedPaths.indexOf(path);
        if (registry.requestClose(path) === 'closed') {
            finishClose(path, previousIndex);
        }
    };

    const cancelClose = () => {
        closeDialog.current?.close();
        registry.cancelClose();
    };

    const confirmClose = () => {
        const path = workspace.pendingClosePath;
        if (!path) return;
        const previousIndex = renderedPaths.indexOf(path);
        closeDialog.current?.close();
        const closedPath = registry.confirmClose();
        if (closedPath) finishClose(closedPath, previousIndex);
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
            requestClose(renderedPaths[index]);
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
                {capacityReached ? (
                    <div
                        className="workspace-capacity-notice"
                        role="status"
                        aria-label="Capacité du workspace"
                    >
                        <span>
                            Limite de vues ouvertes atteinte. Fermez une vue
                            avant d’en ouvrir une nouvelle.
                        </span>
                        <button type="button" onClick={dismissCapacityNotice}>
                            Fermer le message
                        </button>
                    </div>
                ) : null}
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
                                aria-describedby={
                                    workspace.dirtyPaths.includes(path)
                                        ? dirtyDescriptionId(path)
                                        : undefined
                                }
                                tabIndex={selected ? 0 : -1}
                                onClick={() => activate(path)}
                                onKeyDown={(event) => moveFocus(event, index)}
                            >
                                {view.title}
                                {workspace.dirtyPaths.includes(path) ? (
                                    <span
                                        className="workspace-dirty"
                                        aria-hidden="true"
                                    >
                                        • Modifié
                                    </span>
                                ) : null}
                            </button>
                            {!view.pinned ? (
                                <button
                                    className="workspace-close"
                                    type="button"
                                    aria-label={`Fermer ${view.title}`}
                                    onClick={() => requestClose(path)}
                                >
                                    ×
                                </button>
                            ) : null}
                            {workspace.dirtyPaths.includes(path) ? (
                                <span
                                    id={dirtyDescriptionId(path)}
                                    className="proof-visually-hidden"
                                >
                                    Modifications non enregistrées
                                </span>
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
                            <ProfileView
                                loadProfile={loadProfile}
                                onDirtyChange={(dirty) =>
                                    registry.setDirty(PROFILE_PATH, dirty)
                                }
                            />
                        )}
                    </WorkspacePanel>
                );
            })}

            <dialog
                ref={closeDialog}
                className="workspace-dialog"
                aria-labelledby="workspace-discard-title"
                aria-describedby="workspace-discard-message"
                onCancel={(event) => {
                    event.preventDefault();
                    cancelClose();
                }}
            >
                <h2 id="workspace-discard-title">
                    Modifications non enregistrées
                </h2>
                <p id="workspace-discard-message">
                    Fermer cette vue supprimera les modifications du profil.
                </p>
                <div className="proof-actions workspace-dialog-actions">
                    <button type="button" autoFocus onClick={cancelClose}>
                        Annuler
                    </button>
                    <button type="button" onClick={confirmClose}>
                        Fermer sans enregistrer
                    </button>
                </div>
            </dialog>
        </main>
    );
}

function App({
    accessStore,
    sessionStore,
    maxOpenViews = PROFILED_WORKSPACE_CAPACITY,
}: AppProps = {}) {
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
            key={`${session.sessionKey}:${session.subjectKey}:${maxOpenViews}`}
            accessStore={stores.access}
            session={session}
            maxOpenViews={maxOpenViews}
            onEndSession={() => stores.session.replace(null)}
            onReplaceSession={replaceSession}
        />
    );
}

export default App;
