import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import { App } from './app/app';
import './styles.scss';

const container = document.getElementById('root');
if (!container) throw new Error("L'élément racine #root est absent.");

createRoot(container).render(
    <StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </StrictMode>
);
