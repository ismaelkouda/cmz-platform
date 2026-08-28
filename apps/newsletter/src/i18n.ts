import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

// Traductions chargées via HTTP depuis public/i18n/{lng}.json — même
// convention que apps/newsletter-test (Angular/Transloco) : les fichiers
// vivent en dehors du bundle JS, servis tels quels par Vite (copie native de
// public/ vers la racine du build, contrairement à Angular qui exige une
// entrée explicite dans project.json targets.build.options.assets).
void i18n
    .use(HttpBackend)
    .use(initReactI18next)
    .init({
        lng: 'fr',
        fallbackLng: 'fr',
        supportedLngs: ['fr', 'en'],
        backend: {
            loadPath: '/i18n/{{lng}}.json',
        },
        interpolation: {
            escapeValue: false,
        },
    });
