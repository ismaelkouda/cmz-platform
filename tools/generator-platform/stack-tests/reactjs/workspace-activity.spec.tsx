import { Activity, useEffect, useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(cleanup);

function WorkspacePage({ onEffect }: { onEffect: () => void }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        onEffect();
        return () => onEffect();
    }, [onEffect]);

    return (
        <div>
            <input aria-label="Brouillon" />
            <button onClick={() => setCount((value) => value + 1)}>
                Compteur {count}
            </button>
        </div>
    );
}

function view(mode: 'visible' | 'hidden', onEffect: () => void) {
    return (
        <Activity mode={mode}>
            <WorkspacePage onEffect={onEffect} />
        </Activity>
    );
}

describe('qualification React 19.3 du workspace vivant', () => {
    it('conserve le même DOM et le même état local entre deux activations', () => {
        const onEffect = vi.fn();
        const rendered = render(view('visible', onEffect));
        const draft = screen.getByRole('textbox', { name: 'Brouillon' });
        fireEvent.change(draft, { target: { value: 'travail en cours' } });
        fireEvent.click(screen.getByRole('button', { name: 'Compteur 0' }));

        rendered.rerender(view('hidden', onEffect));
        expect(screen.queryByRole('textbox', { name: 'Brouillon' })).toBeNull();

        rendered.rerender(view('visible', onEffect));
        expect(screen.getByRole('textbox', { name: 'Brouillon' })).toBe(draft);
        expect(draft).toHaveProperty('value', 'travail en cours');
        expect(screen.getByRole('button', { name: 'Compteur 1' })).toBeTruthy();
    });

    it('nettoie les Effects masqués puis les relance à la réactivation', () => {
        const request = vi.fn();
        const stop = vi.fn();
        function Page() {
            useEffect(() => {
                request();
                return () => stop();
            }, []);
            return <p>Vue</p>;
        }
        const renderPage = (mode: 'visible' | 'hidden') => (
            <Activity mode={mode}>
                <Page />
            </Activity>
        );
        const rendered = render(renderPage('visible'));
        expect(request).toHaveBeenCalledOnce();

        rendered.rerender(renderPage('hidden'));
        expect(stop).toHaveBeenCalledOnce();

        rendered.rerender(renderPage('visible'));
        expect(request).toHaveBeenCalledTimes(2);
    });

    it('conserve séparément les états de deux identités ouvertes', () => {
        const onEffect = vi.fn();
        const pages = (active: 'a' | 'b') => (
            <main>
                <section data-testid="a">
                    <Activity mode={active === 'a' ? 'visible' : 'hidden'}>
                        <WorkspacePage onEffect={onEffect} />
                    </Activity>
                </section>
                <section data-testid="b">
                    <Activity mode={active === 'b' ? 'visible' : 'hidden'}>
                        <WorkspacePage onEffect={onEffect} />
                    </Activity>
                </section>
            </main>
        );
        const rendered = render(pages('a'));
        fireEvent.click(screen.getByRole('button', { name: 'Compteur 0' }));

        rendered.rerender(pages('b'));
        expect(screen.getByRole('button', { name: 'Compteur 0' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Compteur 0' }));

        rendered.rerender(pages('a'));
        expect(screen.getByRole('button', { name: 'Compteur 1' })).toBeTruthy();
    });

    it('détruit l’état local lorsque la vue est fermée', () => {
        const onEffect = vi.fn();
        const rendered = render(view('visible', onEffect));
        fireEvent.click(screen.getByRole('button', { name: 'Compteur 0' }));
        const oldDraft = screen.getByRole('textbox', { name: 'Brouillon' });

        rendered.rerender(<div>Vue fermée</div>);
        rendered.rerender(view('visible', onEffect));

        expect(screen.getByRole('button', { name: 'Compteur 0' })).toBeTruthy();
        expect(screen.getByRole('textbox', { name: 'Brouillon' })).not.toBe(
            oldDraft
        );
    });
});
