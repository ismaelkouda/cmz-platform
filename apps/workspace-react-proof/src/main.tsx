import { StrictMode } from 'react';
import { BrowserRouter } from 'react-router';
import * as ReactDOM from 'react-dom/client';
import App from './app/app';

const container = document.getElementById('root');
if (!container) throw new Error("L'élément racine #root est absent.");
const root = ReactDOM.createRoot(container);

root.render(
    <StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </StrictMode>
);
