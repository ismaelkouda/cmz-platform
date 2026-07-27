import { Routes } from '@angular/router';
import {
    FORGOT_PASSWORD_ROUTE,
    LOGIN_ROUTE,
    RESET_PASSWORD_ROUTE,
} from './constants/authentication-paths.constant';

/**
 * Routes du module `authentication` (lazy). Pas de guard ici : les 3 pages
 * sont par nature accessibles sans session (décision "Hors périmètre" du
 * plan — un guard anti-session-existante appartient au routing app-level,
 * pas à ce module).
 */
export const AUTHENTICATION_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: LOGIN_ROUTE },
    {
        path: LOGIN_ROUTE,
        loadComponent: () =>
            import('./features/login.component').then((m) => m.LoginComponent),
    },
    {
        path: FORGOT_PASSWORD_ROUTE,
        loadComponent: () =>
            import('./features/forgot-password.component').then(
                (m) => m.ForgotPasswordComponent
            ),
    },
    {
        path: RESET_PASSWORD_ROUTE,
        loadComponent: () =>
            import('./features/reset-password.component').then(
                (m) => m.ResetPasswordComponent
            ),
    },
];
