import { Routes } from '@angular/router';
import { SLIDE_FORM, SLIDE_LIST } from '../constants/slide-paths.constant';

export const SLIDE_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: SLIDE_LIST },
    {
        path: SLIDE_LIST,
        loadComponent: () =>
            import('./slide-list.component').then((m) => m.SlideListComponent),
    },
    {
        path: SLIDE_FORM,
        loadComponent: () =>
            import('./slide-form.component').then((m) => m.SlideFormComponent),
    },
];
