import { StrictMode, Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import * as ReactDOM from 'react-dom/client';
import App from './app/app';
import './tailwind.css';
import './i18n';

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

// Suspense obligatoire : useTranslation() a useSuspense=true par défaut
// (doc officielle react-i18next) et nos traductions sont chargées via HTTP
// backend de façon asynchrone (voir src/i18n.ts) — sans ce boundary, React
// lève "A component suspended while rendering, but no fallback UI was
// specified" au premier rendu, avant que fr.json/en.json ne soient arrivés.
root.render(
    <StrictMode>
        <Suspense fallback={null}>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </Suspense>
    </StrictMode>
);
