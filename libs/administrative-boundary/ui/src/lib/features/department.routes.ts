import { Routes } from '@angular/router';
import {
    DEPARTMENT_FORM,
    DEPARTMENT_LIST,
} from '../constants/department-paths.constant';

export const DEPARTMENT_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: DEPARTMENT_LIST },
    {
        path: DEPARTMENT_LIST,
        loadComponent: () =>
            import('./department-list.component').then(
                (m) => m.DepartmentListComponent
            ),
    },
    {
        path: DEPARTMENT_FORM,
        loadComponent: () =>
            import('./department-form.component').then(
                (m) => m.DepartmentFormComponent
            ),
    },
];
