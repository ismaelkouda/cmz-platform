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
    NAVIGATION_PORT,
    NOTIFICATION_PORT,
    STORAGE_PORT,
    TranslationPort,
} from '@cmz/shared-application';
import { errorInterceptor } from '@cmz/shared-data';
import {
    BrowserExcelExportAdapter,
    BrowserNavigationAdapter,
    BrowserStorageAdapter,
    ConsoleLoggerAdapter,
} from '@cmz/shared-browser';
import {
    CONFIRM_DIALOG_PORT,
    CmzConfirmDialogService,
    CmzNotificationService,
    EXCEL_EXPORT_PORT,
    I18nextTranslationService,
    TRUSTED_ORIGIN_PORT,
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
        { provide: STORAGE_PORT, useExisting: BrowserStorageAdapter },
        // Jeton NAVIGATION_PORT séparé du contrat (interface pure) depuis
        // ADR-0024 — vit dans @cmz/shared-application (pas @cmz/core, qui
        // n'est pas consommable depuis type:application).
        { provide: NAVIGATION_PORT, useExisting: BrowserNavigationAdapter },
        // Jeton EXCEL_EXPORT_PORT colocalisé dans @cmz/shared-ui (ADR-0024)
        // — consommé par 4 modules fonctionnels isolés par scope:*.
        { provide: EXCEL_EXPORT_PORT, useExisting: BrowserExcelExportAdapter },
        BrowserExcelExportAdapter,
        // Jeton NOTIFICATION_PORT colocalise dans @cmz/shared-application
        // (ADR-0024) - consommateurs a la fois type:ui et type:application.
        {
            provide: NOTIFICATION_PORT,
            useExisting: CmzNotificationService,
        },
        // Jeton CONFIRM_DIALOG_PORT colocalisé dans @cmz/shared-ui (ADR-0024)
        // — consommé par de nombreux modules fonctionnels isolés par scope:*.
        {
            provide: CONFIRM_DIALOG_PORT,
            useExisting: CmzConfirmDialogService,
        },
        { provide: TranslationPort, useExisting: I18nextTranslationService },
        // Audit I-14/I-15 : origine du lien Grafana embarqué (SafeUrlPipe).
        // Jeton TRUSTED_ORIGIN_PORT colocalisé dans @cmz/shared-ui (ADR-0024)
        // — pas @cmz/core, qui n'est pas consommable depuis type:ui.
        { provide: TRUSTED_ORIGIN_PORT, useExisting: TrustedOriginAdapter },
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
