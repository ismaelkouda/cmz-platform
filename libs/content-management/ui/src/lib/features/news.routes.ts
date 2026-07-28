import { Routes } from '@angular/router';
import { NEWS_FORM, NEWS_LIST } from '../constants/news-paths.constant';

export const NEWS_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: NEWS_LIST },
    {
        path: NEWS_LIST,
        loadComponent: () =>
            import('./news-list.component').then((m) => m.NewsListComponent),
    },
    {
        path: NEWS_FORM,
        loadComponent: () =>
            import('./news-form.component').then((m) => m.NewsFormComponent),
    },
];
