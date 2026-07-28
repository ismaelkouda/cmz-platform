import { Routes } from '@angular/router';
import {
    PRIVACY_POLICY_FORM,
    PRIVACY_POLICY_LIST,
} from '../constants/privacy-policy-paths.constant';

export const PRIVACY_POLICY_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: PRIVACY_POLICY_LIST },
    {
        path: PRIVACY_POLICY_LIST,
        loadComponent: () =>
            import('./privacy-policy-list.component').then(
                (m) => m.PrivacyPolicyListComponent
            ),
    },
    {
        path: PRIVACY_POLICY_FORM,
        loadComponent: () =>
            import('./privacy-policy-form.component').then(
                (m) => m.PrivacyPolicyFormComponent
            ),
    },
];
