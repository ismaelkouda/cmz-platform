import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActionRequestClient,
    type FetchPort,
} from '@cmz/newsletter-react-data';
import { validateSubscribeNewsletterInput } from '@cmz/newsletter-react-domain';
import { createActionRequestHooks } from '@cmz/newsletter-react-application';

// Cas de test : générateur + mock local, pas de vrai backend.
// Voir apps/newsletter-test/src/mock/newsletter-mock-server.mjs (même mock,
// réutilisé pour les deux stacks — un seul contrat HTTP à faire tourner).
const NEWSLETTER_MOCK_BASE_URL = 'http://localhost:4310';

// FetchPort : le générateur découple le client HTTP du fetch natif pour
// rester testable sans réseau réel (voir libs/newsletter-react/data/src/
// action-request-client.ts). Ici on branche le vrai fetch du navigateur.
const nativeFetch: FetchPort = (url, init) =>
    fetch(url, { method: init.method, headers: init.headers, body: init.body });

const client = new ActionRequestClient(NEWSLETTER_MOCK_BASE_URL, nativeFetch);

// ReactHooksPort : même logique de découplage côté hooks — permet de tester
// createActionRequestHooks() avec de faux useState/useCallback sans monter
// de vrai arbre React. Ici on branche les vrais hooks React.
const { useSubscribeNewsletter } = createActionRequestHooks(
    { useState, useCallback },
    client
);

function App() {
    const { t, i18n } = useTranslation();
    const [email, setEmail] = useState('');
    const { state, execute } = useSubscribeNewsletter();

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const issues = validateSubscribeNewsletterInput({ email });
        if (issues.length > 0) return;
        void execute({ email });
    };

    return (
        <main className="mx-auto max-w-md p-8">
            <div className="mb-4 flex justify-end gap-2 text-sm">
                <button
                    type="button"
                    className={`underline ${i18n.resolvedLanguage === 'fr' ? 'font-semibold' : ''}`}
                    onClick={() => void i18n.changeLanguage('fr')}
                >
                    FR
                </button>
                <button
                    type="button"
                    className={`underline ${i18n.resolvedLanguage === 'en' ? 'font-semibold' : ''}`}
                    onClick={() => void i18n.changeLanguage('en')}
                >
                    EN
                </button>
            </div>

            <h1 className="text-xl font-semibold text-gray-900">
                {t('newsletter.title')}
            </h1>

            <form className="mt-6 flex flex-col gap-3" onSubmit={handleSubmit}>
                <label
                    className="text-sm font-medium text-gray-700"
                    htmlFor="email"
                >
                    {t('newsletter.emailLabel')}
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="rounded border border-gray-300 px-3 py-2"
                    placeholder={t('newsletter.emailPlaceholder')}
                />
                <button
                    type="submit"
                    className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                    disabled={state.status === 'pending'}
                >
                    {t('newsletter.submit')}
                </button>
            </form>

            {state.status === 'success' && (
                <p className="mt-4 rounded bg-green-50 p-3 text-green-800">
                    {t('newsletter.successMessage', {
                        subscriptionId: state.value.subscription_id,
                        message: state.value.message,
                    })}
                </p>
            )}
            {state.status === 'error' && (
                <p className="mt-4 rounded bg-red-50 p-3 text-red-800">
                    {t('newsletter.errorMessage', {
                        message:
                            state.error instanceof Error
                                ? state.error.message
                                : 'Erreur inconnue',
                    })}
                </p>
            )}
            {state.status === 'pending' && (
                <p className="mt-4 text-gray-500">{t('newsletter.sending')}</p>
            )}
        </main>
    );
}

export default App;
