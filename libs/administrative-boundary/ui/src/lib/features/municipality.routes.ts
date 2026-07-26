import { Routes } from '@angular/router';
import {
    MUNICIPALITY_FORM,
    MUNICIPALITY_LIST,
} from '../constants/municipality-paths.constant';

export const MUNICIPALITY_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: MUNICIPALITY_LIST },
    {
        path: MUNICIPALITY_LIST,
        loadComponent: () =>
            import('./municipality-list.component').then(
                (m) => m.MunicipalityListComponent
            ),
    },
    {
        path: MUNICIPALITY_FORM,
        loadComponent: () =>
            import('./municipality-form.component').then(
                (m) => m.MunicipalityFormComponent
            ),
    },
];
