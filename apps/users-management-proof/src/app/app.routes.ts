import { Routes } from '@angular/router';

import { appAccessGuard } from './access.guard';

export const appRoutes: Routes = [
    {
        path: 'settings-security/users',
        data: { access: { mode: 'authenticated', permissions: [] } },
        canActivate: [appAccessGuard],
        loadComponent: () =>
            import('./pages/page_6666666666666666/page.component').then(
                (module) => module.PageComponent
            ),
    },
    { path: '**', redirectTo: '' },
];
