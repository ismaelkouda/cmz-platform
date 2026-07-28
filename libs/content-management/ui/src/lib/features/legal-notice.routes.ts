import { Routes } from '@angular/router';
import {
    LEGAL_NOTICE_FORM,
    LEGAL_NOTICE_LIST,
} from '../constants/legal-notice-paths.constant';

export const LEGAL_NOTICE_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: LEGAL_NOTICE_LIST },
    {
        path: LEGAL_NOTICE_LIST,
        loadComponent: () =>
            import('./legal-notice-list.component').then(
                (m) => m.LegalNoticeListComponent
            ),
    },
    {
        path: LEGAL_NOTICE_FORM,
        loadComponent: () =>
            import('./legal-notice-form.component').then(
                (m) => m.LegalNoticeFormComponent
            ),
    },
];
