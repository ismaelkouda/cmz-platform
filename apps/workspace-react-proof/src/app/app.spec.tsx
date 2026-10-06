import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from './app';

const profile = { name: 'Soumaila Kouda', role: 'Administrateur' };

function renderApp(path = '/workspace/dashboard') {
    window.history.replaceState(null, '', path);
    return render(
        <BrowserRouter>
            <App />
        </BrowserRouter>
    );
}

describe('React workspace host', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                new Response(JSON.stringify(profile), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
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
        fireEvent.click(screen.getByRole('tab', { name: 'Tableau de bord' }));
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

    it('normalizes unknown routes without opening an invalid view', async () => {
        renderApp('/inconnue');

        await waitFor(() =>
            expect(window.location.pathname).toBe('/workspace/dashboard')
        );
        expect(screen.getAllByRole('tab')).toHaveLength(1);
    });
});
