import {
    ApplicationConfig,
    ErrorHandler,
    provideBrowserGlobalErrorListeners,
    isDevMode,
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
    TRUSTED_ORIGIN_PORT,
} from '@cmz/shared-ui';
import { appRoutes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { provideDevPermissions } from './dev/dev-permissions.provider';
import { provideAdministrativeBoundary } from './providers/administrative-boundary.providers';
import { TranslocoHttpLoader } from './transloco-loader';
import { provideTransloco } from '@jsverse/transloco';

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
        // i18n : Transloco (convergence de tout l'Angular du repo sur un seul
        // mécanisme — voir docs/architecture/i18n-generator-scope.md). Ancien
        // TranslationPort/I18nextTranslationService/provideI18n() retirés :
        // migration complète, pas de coexistence des deux mécanismes ici.
        provideTransloco({
            config: {
                availableLangs: ['fr'],
                defaultLang: 'fr',
                reRenderOnLangChange: true,
                prodMode: !isDevMode(),
            },
            loader: TranslocoHttpLoader,
        }),
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
        //
        // administrative-boundary reste fourni ici statiquement (pas
        // route-scoped comme les 14 autres modules migrés en 2026-08-21,
        // voir app.routes.ts) : `RegionSelectFacade`
        // (@cmz/administrative-boundary-application) est consommé hors de
        // son propre module par `MessagingFormStore`
        // (libs/communication/ui/src/lib/stores/messaging-form.store.ts,
        // cascade région → département → commune du formulaire de
        // messagerie). Si `provideAdministrativeBoundary()` n'était fourni
        // que sous les routes `territorial-structures/*`, visiter
        // `communication/messaging` sans jamais avoir visité
        // `territorial-structures/*` lèverait un `NullInjectorError` sur
        // `RegionSelectRepository`. Confirmé par audit du repo (aucun autre
        // module migré n'a de consommateur en dehors de son propre
        // périmètre applicatif) — voir aussi les docstrings de
        // `provideAdministrativeBoundary()`/`provideAuthentication()`/
        // `provideCoverageAreas()`/`provideAdministrativeInfrastructure()`
        // qui documentaient déjà ce risque générique ("façades/use-cases
        // sont des singletons root") sans qu'il ne se matérialise pour ces
        // trois derniers modules.
        ...provideAdministrativeBoundary(),
        // DEV ONLY : accorde toutes les permissions (no-op hors isDevMode()).
        ...provideDevPermissions(),
    ],
};
