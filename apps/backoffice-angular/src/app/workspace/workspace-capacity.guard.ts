import { inject } from '@angular/core';
import { CanActivateChildFn } from '@angular/router';
import {
    LocalizeTranslationService,
    NOTIFICATION_PORT,
    NotificationPort,
} from '@cmz/shared-application';
import { WorkspaceService } from '@cmz/shared-ui';

export function canonicalWorkspaceUrl(url: string): string {
    return url.split(/[?#]/, 1)[0] || '/';
}

export const workspaceCapacityGuard: CanActivateChildFn = (_route, state) => {
    const workspace = inject(WorkspaceService);
    if (workspace.canOpen(canonicalWorkspaceUrl(state.url))) {
        return true;
    }

    const message = inject(LocalizeTranslationService).translate(
        'WORKSPACE.CAPACITY_REACHED'
    );
    inject<NotificationPort>(NOTIFICATION_PORT).warning(message);
    return false;
};
