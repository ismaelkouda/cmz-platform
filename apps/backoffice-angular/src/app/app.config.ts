import {
    ApplicationConfig,
    ErrorHandler,
    provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import {
    GlobalErrorHandler,
    LOGGER_PORT,
    TrustedOriginAdapter,
    cacheInterceptor,
} from '@cmz/core';
import {
    ConfirmDialogPort,
    NotificationPort,
    TranslationPort,
} from '@cmz/shared-application';
import {
    ExcelExportPort,
    NavigationPort,
    StoragePort,
    TrustedOriginPort,
} from '@cmz/shared-domain';
import { errorInterceptor } from '@cmz/shared-data';
import {
    BrowserExcelExportAdapter,
    BrowserNavigationAdapter,
    BrowserStorageAdapter,
    ConsoleLoggerAdapter,
} from '@cmz/shared-browser';
import {
    CmzConfirmDialogService,
    CmzNotificationService,
    I18nextTranslationService,
} from '@cmz/shared-ui';
import { appRoutes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
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
import { provideInteractiveMap } from './providers/interactive-map.providers';
import { provideReportStates } from './providers/report-states.providers';
import { provideProcessing } from './providers/processing.providers';
import { provideRequests } from './providers/requests.providers';
import { provideFinalization } from './providers/finalization.providers';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        // Ordre = ordre de traversée requête (le dernier est le plus proche
        // du réseau) : auth (attache le jeton) → error (normalise les
        // échecs de transport en DomainError) → cache (court-circuite vers
        // le réseau seulement si nécessaire — doit voir la requête déjà
        // authentifiée, et ses erreurs doivent être normalisées comme
        // toutes les autres).
        provideHttpClient(
            withInterceptors([
                authInterceptor,
                errorInterceptor,
                cacheInterceptor,
            ])
        ),
        provideRouter(appRoutes),
        provideI18n(),
        // Adaptateurs des ports (design-system + moteurs agnostiques).
        { provide: StoragePort, useExisting: BrowserStorageAdapter },
        { provide: NavigationPort, useExisting: BrowserNavigationAdapter },
        { provide: ExcelExportPort, useExisting: BrowserExcelExportAdapter },
        BrowserExcelExportAdapter,
        { provide: NotificationPort, useExisting: CmzNotificationService },
        { provide: ConfirmDialogPort, useExisting: CmzConfirmDialogService },
        { provide: TranslationPort, useExisting: I18nextTranslationService },
        // Audit I-14/I-15 : origine du lien Grafana embarqué (SafeUrlPipe).
        { provide: TrustedOriginPort, useExisting: TrustedOriginAdapter },
        TrustedOriginAdapter,
        // Audit P-1/P-2 : journalisation + ErrorHandler global. Adaptateur
        // console par défaut (P-3, collecteur externe, non décidé) — voir
        // le docstring de LoggerPort. Jeton LOGGER_PORT séparé du contrat
        // (interface pure) depuis ADR-0024.
        { provide: LOGGER_PORT, useExisting: ConsoleLoggerAdapter },
        ConsoleLoggerAdapter,
        { provide: ErrorHandler, useClass: GlobalErrorHandler },
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
        ...provideInteractiveMap(),
        ...provideReportStates(),
        ...provideProcessing(),
        ...provideRequests(),
        ...provideFinalization(),
        // DEV ONLY : accorde toutes les permissions (no-op hors isDevMode()).
        ...provideDevPermissions(),
    ],
};
