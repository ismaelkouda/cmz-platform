import { Routes } from '@angular/router';
import {
    TERMS_USE_FORM,
    TERMS_USE_LIST,
} from '../constants/terms-use-paths.constant';

export const TERMS_USE_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: TERMS_USE_LIST },
    {
        path: TERMS_USE_LIST,
        loadComponent: () =>
            import('./terms-use-list.component').then(
                (m) => m.TermsUseListComponent
            ),
    },
    {
        path: TERMS_USE_FORM,
        loadComponent: () =>
            import('./terms-use-form.component').then(
                (m) => m.TermsUseFormComponent
            ),
    },
];
