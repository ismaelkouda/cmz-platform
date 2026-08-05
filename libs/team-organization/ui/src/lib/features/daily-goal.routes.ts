import { Routes } from '@angular/router';
import { DAILY_GOAL_LIST } from '../constants/daily-goal-paths.constant';

export const DAILY_GOAL_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: DAILY_GOAL_LIST },
    {
        path: DAILY_GOAL_LIST,
        loadComponent: () =>
            import('./daily-goal-list.component').then(
                (m) => m.DailyGoalListComponent
            ),
    },
];
