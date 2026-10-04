import { InjectionToken } from '@angular/core';

export interface WorkspaceConfig {
    /** Plafond de vues vivantes, vue épinglée comprise. */
    maxOpenViews: number;
}

export const WORKSPACE_CONFIG = new InjectionToken<WorkspaceConfig>(
    'WorkspaceConfig'
);
