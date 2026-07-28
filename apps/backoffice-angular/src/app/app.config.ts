import {
    ApplicationConfig,
    provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import {
    ConfirmDialogPort,
    NotificationPort,
    TranslationPort,
} from '@cmz/shared-application';
import { StoragePort } from '@cmz/shared-domain';
import { BrowserStorageAdapter } from '@cmz/shared-browser';
import {
    CmzConfirmDialogService,
    CmzNotificationService,
    I18nextTranslationService,
} from '@cmz/shared-ui';
import { appRoutes } from './app.routes';
import { provideI18n } from './i18n/i18n.provider';
import { provideDevPermissions } from './dev/dev-permissions.provider';
import { provideAdministrativeInfrastructure } from './providers/administrative-infrastructure.providers';
import { provideAdministrativeBoundary } from './providers/administrative-boundary.providers';
import { provideAuthentication } from './providers/authentication.providers';
import { provideCoverageAreas } from './providers/coverage-areas.providers';
import { provideTeamOrganization } from './providers/team-organization.providers';
import { provideContentManagement } from './providers/content-management.providers';
import { provideSettingsSecurity } from './providers/settings-security.providers';
import { provideCommunication } from './providers/communication.providers';
import { provideDashboard } from './providers/dashboard.providers';
import { provideMonitoring } from './providers/monitoring.providers';
import { provideReporting } from './providers/reporting.providers';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideHttpClient(),
        provideRouter(appRoutes),
        provideI18n(),
        // Adaptateurs des ports (design-system + moteurs agnostiques).
        { provide: StoragePort, useExisting: BrowserStorageAdapter },
        { provide: NotificationPort, useExisting: CmzNotificationService },
        { provide: ConfirmDialogPort, useExisting: CmzConfirmDialogService },
        { provide: TranslationPort, useExisting: I18nextTranslationService },
        // Composition root des modules (ports domaine -> impls data).
        ...provideAdministrativeInfrastructure(),
        ...provideAdministrativeBoundary(),
        ...provideAuthentication(),
        ...provideCoverageAreas(),
        ...provideTeamOrganization(),
        ...provideContentManagement(),
        ...provideSettingsSecurity(),
        ...provideCommunication(),
        ...provideDashboard(),
        ...provideMonitoring(),
        ...provideReporting(),
        // DEV ONLY : accorde toutes les permissions (no-op hors isDevMode()).
        ...provideDevPermissions(),
    ],
};
