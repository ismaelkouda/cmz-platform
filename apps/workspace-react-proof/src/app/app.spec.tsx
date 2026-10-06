import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { BrowserRouter, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from './app';
import {
    WorkspaceAccessStore,
    WorkspaceSessionStore,
} from './workspace-security-store';
import type { WorkspaceSession } from './workspace-security-store';

const profile = { name: 'Soumaila Kouda', role: 'Administrateur' };

const UPDATED_PROFILE_URL =
    '/workspace/profile?section=permissions&filter=active%2Fpending&filter=locked+out#security%2Froles';
const SESSION_A: WorkspaceSession = {
    sessionKey: 'proof-session-a',
    subjectKey: 'proof-user-a',
};
const SESSION_B: WorkspaceSession = {
    sessionKey: 'proof-session-b',
    subjectKey: 'proof-user-b',
};
const SESSION_A_REFRESHED: WorkspaceSession = {
    sessionKey: 'proof-session-a-refreshed',
    subjectKey: 'proof-user-a',
};

if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function (): void {
        this.setAttribute('open', '');
    };
}
if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function (): void {
        this.removeAttribute('open');
    };
}

function NavigationProbe() {
    const navigate = useNavigate();
    return (
        <button
            type="button"
            onClick={() => void navigate(UPDATED_PROFILE_URL)}
        >
            Modifier le contexte profil
        </button>
    );
}

function renderApp(
    path = '/workspace/dashboard',
    withProbe = false,
    accessStore?: WorkspaceAccessStore,
    sessionStore?: WorkspaceSessionStore,
    maxOpenViews?: number
) {
    window.history.replaceState(null, '', path);
    return render(
        <BrowserRouter>
            <App
                accessStore={accessStore}
                sessionStore={sessionStore}
                maxOpenViews={maxOpenViews}
            />
            {withProbe ? <NavigationProbe /> : null}
        </BrowserRouter>
    );
}

describe('React workspace host', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockImplementation(() =>
                Promise.resolve(
                    new Response(JSON.stringify(profile), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    })
                )
            )
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('refuses a new view at capacity without eviction or network request', async () => {
        renderApp('/workspace/dashboard', false, undefined, undefined, 1);

        fireEvent.click(
            screen.getByRole('button', { name: 'Ouvrir le profil' })
        );

        expect(window.location.pathname).toBe('/workspace/dashboard');
        expect(screen.getAllByRole('tab')).toHaveLength(1);
        expect(
            screen
                .getByRole('tab', { name: 'Tableau de bord' })
                .getAttribute('aria-selected')
        ).toBe('true');
        expect(screen.queryByRole('tab', { name: 'Profil' })).toBeNull();
        expect(screen.queryByText('Profil utilisateur')).toBeNull();
        expect(fetch).not.toHaveBeenCalled();

        const notice = screen.getByRole('status', {
            name: 'Capacité du workspace',
        });
        expect(notice.textContent).toContain(
            'Limite de vues ouvertes atteinte.'
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Fermer le message' })
        );
        expect(
            screen.queryByRole('status', { name: 'Capacité du workspace' })
        ).toBeNull();
    });

    it('normalizes a direct route that exceeds capacity before mounting it', async () => {
        renderApp('/workspace/profile', false, undefined, undefined, 1);

        await waitFor(() =>
            expect(window.location.pathname).toBe('/workspace/dashboard')
        );
        expect(screen.getAllByRole('tab')).toHaveLength(1);
        expect(screen.queryByRole('tab', { name: 'Profil' })).toBeNull();
        expect(screen.queryByText('Profil utilisateur')).toBeNull();
        expect(fetch).not.toHaveBeenCalled();
        expect(
            screen.getByRole('status', { name: 'Capacité du workspace' })
        ).toBeTruthy();
    });

    it('opens the canonical route and preserves local state without another GET', async () => {
        renderApp();

        fireEvent.click(
            screen.getByRole('button', { name: 'Ouvrir le profil' })
        );
        expect(window.location.pathname).toBe('/workspace/profile');
        await screen.findByText('Soumaila Kouda');

        const note = screen.getByRole('textbox', {
            name: 'Note locale non enregistrée',
        });
        fireEvent.change(note, { target: { value: 'État conservé' } });
        expect(screen.getByText('• Modifié')).toBeTruthy();
        fireEvent.click(screen.getByRole('tab', { name: 'Tableau de bord' }));
        expect(screen.queryByRole('dialog')).toBeNull();
        fireEvent.click(screen.getByRole('tab', { name: 'Profil' }));

        expect((note as HTMLInputElement).value).toBe('État conservé');
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('destroys a closed view and creates fresh local state when reopened', async () => {
        const { container } = renderApp('/workspace/profile');
        await screen.findByText('Soumaila Kouda');
        const firstArticle =
            container.querySelector<HTMLElement>('[data-instance-id]');
        const firstInstance = firstArticle?.dataset['instanceId'];

        fireEvent.change(
            screen.getByRole('textbox', {
                name: 'Note locale non enregistrée',
            }),
            { target: { value: 'À supprimer' } }
        );
        fireEvent.click(screen.getByRole('button', { name: 'Fermer Profil' }));
        expect(
            screen.getByRole('dialog', {
                name: 'Modifications non enregistrées',
            })
        ).toBeTruthy();
        expect(window.location.pathname).toBe('/workspace/profile');
        fireEvent.click(
            screen.getByRole('button', { name: 'Fermer sans enregistrer' })
        );
        expect(window.location.pathname).toBe('/workspace/dashboard');
        expect(screen.queryByRole('tab', { name: 'Profil' })).toBeNull();

        fireEvent.click(
            screen.getByRole('button', { name: 'Ouvrir le profil' })
        );
        await waitFor(() =>
            expect(screen.getByRole('tab', { name: 'Profil' })).toBeTruthy()
        );
        const secondArticle =
            container.querySelector<HTMLElement>('[data-instance-id]');

        expect(secondArticle?.dataset['instanceId']).not.toBe(firstInstance);
        expect(
            (
                screen.getByRole('textbox', {
                    name: 'Note locale non enregistrée',
                }) as HTMLInputElement
            ).value
        ).toBe('');
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('cancels dirty close without losing the view or value', async () => {
        renderApp('/workspace/profile');
        await screen.findByText('Soumaila Kouda');
        const note = screen.getByRole('textbox', {
            name: 'Note locale non enregistrée',
        });
        const closeButton = screen.getByRole('button', {
            name: 'Fermer Profil',
        });
        fireEvent.change(note, { target: { value: 'À conserver' } });
        fireEvent.click(closeButton);

        fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

        expect(screen.queryByRole('dialog')).toBeNull();
        expect(screen.getByRole('tab', { name: 'Profil' })).toBeTruthy();
        expect((note as HTMLInputElement).value).toBe('À conserver');
        expect(window.location.pathname).toBe('/workspace/profile');
    });

    it('removes the dirty guard when the pilot field returns to its initial value', async () => {
        renderApp('/workspace/profile');
        await screen.findByText('Soumaila Kouda');
        const note = screen.getByRole('textbox', {
            name: 'Note locale non enregistrée',
        });
        fireEvent.change(note, { target: { value: 'Temporaire' } });
        fireEvent.change(note, { target: { value: '' } });

        fireEvent.click(screen.getByRole('button', { name: 'Fermer Profil' }));

        expect(screen.queryByRole('dialog')).toBeNull();
        expect(screen.queryByRole('tab', { name: 'Profil' })).toBeNull();
        expect(window.location.pathname).toBe('/workspace/dashboard');
    });

    it('protects browser unload only while a view is dirty', async () => {
        renderApp('/workspace/profile');
        await screen.findByText('Soumaila Kouda');
        const note = screen.getByRole('textbox', {
            name: 'Note locale non enregistrée',
        });
        const cleanEvent = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(cleanEvent);
        expect(cleanEvent.defaultPrevented).toBe(false);

        fireEvent.change(note, { target: { value: 'Brouillon' } });
        const dirtyEvent = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(dirtyEvent);
        expect(dirtyEvent.defaultPrevented).toBe(true);

        fireEvent.change(note, { target: { value: '' } });
        const clearedEvent = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(clearedEvent);
        expect(clearedEvent.defaultPrevented).toBe(false);
    });

    it('restores the exact last query and fragment without duplicating the view', async () => {
        renderApp('/workspace/profile?section=summary#overview', true);
        await screen.findByText('Soumaila Kouda');

        const note = screen.getByRole('textbox', {
            name: 'Note locale non enregistrée',
        });
        fireEvent.change(note, { target: { value: 'Contexte conservé' } });
        fireEvent.click(
            screen.getByRole('button', {
                name: 'Modifier le contexte profil',
            })
        );
        await waitFor(() =>
            expect(
                `${window.location.pathname}${window.location.search}${window.location.hash}`
            ).toBe(UPDATED_PROFILE_URL)
        );
        fireEvent.click(screen.getByRole('tab', { name: 'Tableau de bord' }));
        fireEvent.click(screen.getByRole('tab', { name: 'Profil' }));

        expect(
            `${window.location.pathname}${window.location.search}${window.location.hash}`
        ).toBe(UPDATED_PROFILE_URL);
        expect((note as HTMLInputElement).value).toBe('Contexte conservé');
        expect(screen.getAllByRole('tab', { name: 'Profil' })).toHaveLength(1);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('normalizes unknown routes without opening an invalid view', async () => {
        renderApp('/inconnue');

        await waitFor(() =>
            expect(window.location.pathname).toBe('/workspace/dashboard')
        );
        expect(screen.getAllByRole('tab')).toHaveLength(1);
    });

    it('refuses a protected direct route before mounting or fetching it', async () => {
        const access = new WorkspaceAccessStore(SESSION_A, null);
        renderApp('/workspace/profile', false, access);

        await waitFor(() =>
            expect(window.location.pathname).toBe('/workspace/dashboard')
        );
        expect(screen.queryByRole('tab', { name: 'Profil' })).toBeNull();
        expect(screen.queryByText('Profil utilisateur')).toBeNull();
        expect(screen.getByText('Accès au profil révoqué.')).toBeTruthy();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('destroys an active protected view and cannot restore it from history', async () => {
        const access = new WorkspaceAccessStore(SESSION_A, [
            '/workspace/profile',
        ]);
        const { container } = renderApp('/workspace/profile', true, access);
        await screen.findByText('Soumaila Kouda');
        const firstInstance = container
            .querySelector<HTMLElement>('[data-instance-id]')
            ?.getAttribute('data-instance-id');
        fireEvent.change(
            screen.getByRole('textbox', {
                name: 'Note locale non enregistrée',
            }),
            { target: { value: 'Brouillon confidentiel' } }
        );
        fireEvent.click(screen.getByRole('button', { name: 'Fermer Profil' }));
        expect(screen.getByRole('dialog')).toBeTruthy();

        act(() => access.replace(SESSION_A, []));

        await waitFor(() =>
            expect(window.location.pathname).toBe('/workspace/dashboard')
        );
        expect(screen.queryByRole('tab', { name: 'Profil' })).toBeNull();
        expect(container.querySelector('[data-instance-id]')).toBeNull();
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(
            screen.queryByRole('textbox', {
                name: 'Note locale non enregistrée',
            })
        ).toBeNull();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Modifier le contexte profil',
            })
        );
        await waitFor(() =>
            expect(window.location.pathname).toBe('/workspace/dashboard')
        );
        expect(screen.queryByRole('tab', { name: 'Profil' })).toBeNull();
        expect(fetch).toHaveBeenCalledTimes(1);

        act(() => access.replace(SESSION_A, ['/workspace/profile']));
        fireEvent.click(
            screen.getByRole('button', { name: 'Ouvrir le profil' })
        );
        await screen.findByText('Soumaila Kouda');
        expect(
            container
                .querySelector<HTMLElement>('[data-instance-id]')
                ?.getAttribute('data-instance-id')
        ).not.toBe(firstInstance);
        expect(
            (
                screen.getByRole('textbox', {
                    name: 'Note locale non enregistrée',
                }) as HTMLInputElement
            ).value
        ).toBe('');
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('destroys a suspended protected view as soon as access is revoked', async () => {
        const access = new WorkspaceAccessStore(SESSION_A, [
            '/workspace/profile',
        ]);
        const { container } = renderApp('/workspace/dashboard', false, access);
        fireEvent.click(
            screen.getByRole('button', { name: 'Ouvrir le profil' })
        );
        await screen.findByText('Soumaila Kouda');
        fireEvent.click(screen.getByRole('tab', { name: 'Tableau de bord' }));

        act(() => access.replace(SESSION_A, []));

        await waitFor(() =>
            expect(screen.queryByRole('tab', { name: 'Profil' })).toBeNull()
        );
        expect(container.querySelector('[data-instance-id]')).toBeNull();
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('purges protected cached data even when its view was already closed', async () => {
        const access = new WorkspaceAccessStore(SESSION_A, [
            '/workspace/profile',
        ]);
        renderApp('/workspace/profile', false, access);
        await screen.findByText('Soumaila Kouda');
        fireEvent.click(screen.getByRole('button', { name: 'Fermer Profil' }));
        expect(fetch).toHaveBeenCalledTimes(1);

        act(() => access.replace(SESSION_A, []));
        act(() => access.replace(SESSION_A, ['/workspace/profile']));
        fireEvent.click(
            screen.getByRole('button', { name: 'Ouvrir le profil' })
        );

        await screen.findByText('Soumaila Kouda');
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('aborts an in-flight protected request when access is revoked', async () => {
        let signal: AbortSignal | undefined;
        vi.mocked(fetch).mockImplementation(
            (_input, init) =>
                new Promise<Response>((_resolve, reject) => {
                    signal = init?.signal ?? undefined;
                    signal?.addEventListener('abort', () => {
                        reject(new DOMException('Aborted', 'AbortError'));
                    });
                })
        );
        const access = new WorkspaceAccessStore(SESSION_A, [
            '/workspace/profile',
        ]);
        const { container } = renderApp('/workspace/profile', false, access);
        await waitFor(() => expect(signal).toBeDefined());

        act(() => access.replace(SESSION_A, null));

        await waitFor(() => expect(signal?.aborted).toBe(true));
        await waitFor(() =>
            expect(window.location.pathname).toBe('/workspace/dashboard')
        );
        expect(container.querySelector('[data-instance-id]')).toBeNull();
    });

    it('refuses a protected direct route when no session exists', async () => {
        const session = new WorkspaceSessionStore(null);
        const access = new WorkspaceAccessStore(SESSION_A, [
            '/workspace/profile',
        ]);
        renderApp('/workspace/profile', false, access, session);

        expect(screen.queryByText('Profil utilisateur')).toBeNull();
        expect(screen.queryByRole('tab')).toBeNull();
        expect(fetch).not.toHaveBeenCalled();
        await waitFor(() =>
            expect(window.location.pathname).toBe('/signed-out')
        );
        expect(screen.getByText('Vous êtes déconnecté')).toBeTruthy();
    });

    it('destroys every view and cache when the identity is replaced', async () => {
        const session = new WorkspaceSessionStore(SESSION_A);
        const access = new WorkspaceAccessStore(SESSION_A, [
            '/workspace/profile',
        ]);
        const { container } = renderApp(
            '/workspace/dashboard',
            false,
            access,
            session
        );
        const firstDashboard = container
            .querySelector<HTMLElement>('[data-dashboard-instance-id]')
            ?.getAttribute('data-dashboard-instance-id');
        fireEvent.click(
            screen.getByRole('button', { name: 'Compteur local : 0' })
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Ouvrir le profil' })
        );
        await screen.findByText('Soumaila Kouda');
        const firstProfile = container
            .querySelector<HTMLElement>('[data-instance-id]')
            ?.getAttribute('data-instance-id');
        fireEvent.change(
            screen.getByRole('textbox', {
                name: 'Note locale non enregistrée',
            }),
            { target: { value: 'Ne doit pas franchir la session' } }
        );

        act(() => {
            access.replace(SESSION_B, ['/workspace/profile']);
            session.replace(SESSION_B);
        });

        await waitFor(() =>
            expect(
                container
                    .querySelector<HTMLElement>('[data-instance-id]')
                    ?.getAttribute('data-instance-id')
            ).not.toBe(firstProfile)
        );
        expect(window.location.pathname).toBe('/workspace/profile');
        expect(screen.getByRole('tab', { name: 'Profil' })).toBeTruthy();
        expect(
            container
                .querySelector<HTMLElement>('[data-dashboard-instance-id]')
                ?.getAttribute('data-dashboard-instance-id')
        ).not.toBe(firstDashboard);
        await screen.findByText('Soumaila Kouda');
        expect(
            (
                screen.getByRole('textbox', {
                    name: 'Note locale non enregistrée',
                }) as HTMLInputElement
            ).value
        ).toBe('');
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('rejects stale permissions when the same identity starts a new session', async () => {
        const session = new WorkspaceSessionStore(SESSION_A);
        const access = new WorkspaceAccessStore(SESSION_A, [
            '/workspace/profile',
        ]);
        renderApp('/workspace/profile', false, access, session);
        await screen.findByText('Soumaila Kouda');

        act(() => session.replace(SESSION_A_REFRESHED));

        await waitFor(() =>
            expect(window.location.pathname).toBe('/workspace/dashboard')
        );
        await waitFor(() =>
            expect(screen.getByText('Accès au profil révoqué.')).toBeTruthy()
        );
        expect(
            screen.queryByRole('button', { name: 'Ouvrir le profil' })
        ).toBeNull();
        expect(screen.queryByRole('tab', { name: 'Profil' })).toBeNull();
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('aborts an in-flight request and blocks history after session end', async () => {
        let signal: AbortSignal | undefined;
        vi.mocked(fetch).mockImplementation(
            (_input, init) =>
                new Promise<Response>((_resolve, reject) => {
                    signal = init?.signal ?? undefined;
                    signal?.addEventListener('abort', () => {
                        reject(new DOMException('Aborted', 'AbortError'));
                    });
                })
        );
        const session = new WorkspaceSessionStore(SESSION_A);
        const access = new WorkspaceAccessStore(SESSION_A, [
            '/workspace/profile',
        ]);
        const { container } = renderApp(
            '/workspace/profile',
            false,
            access,
            session
        );
        await waitFor(() => expect(signal).toBeDefined());

        act(() => session.replace(null));

        await waitFor(() => expect(signal?.aborted).toBe(true));
        await waitFor(() =>
            expect(window.location.pathname).toBe('/signed-out')
        );
        expect(container.querySelector('[data-instance-id]')).toBeNull();
        expect(screen.queryByRole('tab')).toBeNull();

        act(() => {
            window.history.pushState(null, '', '/workspace/profile');
            window.dispatchEvent(new PopStateEvent('popstate'));
        });
        await waitFor(() =>
            expect(window.location.pathname).toBe('/signed-out')
        );
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
