import {
    Activity,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';

import './app.scss';

const DASHBOARD_PATH = '/workspace/dashboard';
const PROFILE_PATH = '/workspace/profile';

type WorkspacePath = typeof DASHBOARD_PATH | typeof PROFILE_PATH;

interface WorkspaceView {
    path: WorkspacePath;
    title: string;
    pinned: boolean;
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
    },
    [PROFILE_PATH]: {
        path: PROFILE_PATH,
        title: 'Profil',
        pinned: false,
    },
};

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

function tabId(path: WorkspacePath): string {
    return `workspace-tab-${path.slice(1).replaceAll('/', '-')}`;
}

function panelId(path: WorkspacePath): string {
    return `workspace-panel-${path.slice(1).replaceAll('/', '-')}`;
}

function DashboardView({ onOpenProfile }: { onOpenProfile: () => void }) {
    const [count, setCount] = useState(0);

    return (
        <article className="proof-card">
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
                <button type="button" onClick={onOpenProfile}>
                    Ouvrir le profil
                </button>
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

function App() {
    const location = useLocation();
    const navigate = useNavigate();
    const requestedPath = normalizePath(location.pathname);
    const [registry] = useState(
        () =>
            new WorkspaceRegistry(
                requestedPath,
                isWorkspacePath(location.pathname)
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
    const profileRequest = useRef<Promise<ProfileSummary> | null>(null);

    useEffect(() => {
        const currentPath = location.pathname;
        if (!isWorkspacePath(currentPath)) {
            void navigate(DASHBOARD_PATH, { replace: true });
            return;
        }

        registry.recordVisit(
            currentPath,
            workspaceActivationUrl(currentPath, location.search, location.hash)
        );
    }, [location.hash, location.pathname, location.search, navigate, registry]);

    const loadProfile = useMemo(
        () => async (): Promise<ProfileSummary> => {
            if (profileCache.current) return profileCache.current;
            if (profileRequest.current) return profileRequest.current;

            profileRequest.current = fetch('/api/workspace/profile')
                .then(async (response) => {
                    if (!response.ok)
                        throw new Error(`HTTP ${response.status}`);
                    return (await response.json()) as ProfileSummary;
                })
                .then((profile) => {
                    profileCache.current = profile;
                    return profile;
                })
                .finally(() => {
                    profileRequest.current = null;
                });

            return profileRequest.current;
        },
        []
    );

    const activate = (path: WorkspacePath) => {
        const targetUrl = registry.activationUrl(path);
        registry.recordVisit(path, targetUrl);
        void navigate(targetUrl);
    };

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
            nextIndex = (index + 1) % openPaths.length;
        if (event.key === 'ArrowLeft') {
            nextIndex = (index - 1 + openPaths.length) % openPaths.length;
        }
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = openPaths.length - 1;
        if (event.key === 'Delete' && !VIEW_CATALOG[openPaths[index]].pinned) {
            event.preventDefault();
            close(openPaths[index]);
            return;
        }
        if (nextIndex === null) return;

        event.preventDefault();
        document.getElementById(tabId(openPaths[nextIndex]))?.focus();
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
            </header>

            <div
                className="workspace-tabs"
                role="tablist"
                aria-label="Vues ouvertes"
            >
                {openPaths.map((path, index) => {
                    const view = VIEW_CATALOG[path];
                    const selected = requestedPath === path;
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

            {openPaths.map((path) => {
                const view = VIEW_CATALOG[path];
                return (
                    <WorkspacePanel
                        key={path}
                        view={view}
                        activePath={requestedPath}
                    >
                        {path === DASHBOARD_PATH ? (
                            <DashboardView
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

export default App;
