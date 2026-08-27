import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';

import App from './app';
import fr from '../../public/i18n/fr.json';

// Instance i18next dédiée aux tests : ressources chargées de façon
// synchrone (pas de backend HTTP réel) — même logique que
// TranslocoTestingModule côté Angular (apps/newsletter-test), voir la
// section « Testing without stubbing » de la doc officielle react-i18next.
const testI18n = i18n.createInstance();
void testI18n.use(initReactI18next).init({
    lng: 'fr',
    fallbackLng: 'fr',
    resources: { fr: { translation: fr } },
    interpolation: { escapeValue: false },
});

function renderApp() {
    return render(
        <I18nextProvider i18n={testI18n}>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </I18nextProvider>
    );
}

describe('App', () => {
    it('should render successfully', () => {
        const { baseElement } = renderApp();
        expect(baseElement).toBeTruthy();
    });

    it('should render the real translated newsletter form title', () => {
        const { getAllByText } = renderApp();
        expect(getAllByText(fr.newsletter.title).length).toBeGreaterThan(0);
    });
});
