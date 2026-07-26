import { Routes } from '@angular/router';

/** Route sœur, cf. `departments-by-region-id.routes.ts` (même décision). */
export const MUNICIPALITIES_BY_DEPARTMENT_ID_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./municipalities-by-department-id.component').then(
                (m) => m.MunicipalitiesByDepartmentIdComponent
            ),
    },
];
