import { Provider } from '@angular/core';
import {
    FiberConstructorSelectRepository,
    MobileNetworkFindOneRepository,
    MobileNetworkRepository,
    OpticalFiberNetworkFindOneRepository,
    OpticalFiberNetworkRepository,
    OpticalFiberNetworkSelectRepository,
    RadioRelayLinksFindOneRepository,
    RadioRelayLinksRepository,
    RadioRelayLinksSelectRepository,
    SiteGroupFindOneRepository,
    SiteGroupRepository,
    SiteGroupSelectRepository,
    TowerTypeSelectRepository,
} from '@cmz/coverage-areas-domain';
import {
    FiberConstructorSelectRepositoryImpl,
    MobileNetworkFindOneRepositoryImpl,
    MobileNetworkRepositoryImpl,
    OpticalFiberNetworkFindOneRepositoryImpl,
    OpticalFiberNetworkRepositoryImpl,
    OpticalFiberNetworkSelectRepositoryImpl,
    RadioRelayLinksFindOneRepositoryImpl,
    RadioRelayLinksRepositoryImpl,
    RadioRelayLinksSelectRepositoryImpl,
    SiteGroupFindOneRepositoryImpl,
    SiteGroupRepositoryImpl,
    SiteGroupSelectRepositoryImpl,
    TowerTypeSelectRepositoryImpl,
} from '@cmz/coverage-areas-data';
import {
    FiberConstructorSelectFacade,
    FiberConstructorSelectUseCase,
    MobileNetworkFacade,
    MobileNetworkFindOneFacade,
    MobileNetworkFindOneUseCase,
    MobileNetworkSelectFacade,
    MobileNetworkSelectUseCase,
    MobileNetworkUseCase,
    OpticalFiberNetworkFacade,
    OpticalFiberNetworkFindOneFacade,
    OpticalFiberNetworkFindOneUseCase,
    OpticalFiberNetworkSelectFacade,
    OpticalFiberNetworkSelectUseCase,
    OpticalFiberNetworkUseCase,
    RadioRelayLinksFacade,
    RadioRelayLinksFindOneFacade,
    RadioRelayLinksFindOneUseCase,
    RadioRelayLinksSelectFacade,
    RadioRelayLinksSelectUseCase,
    RadioRelayLinksUseCase,
    SiteGroupFacade,
    SiteGroupFindOneFacade,
    SiteGroupFindOneUseCase,
    SiteGroupSelectFacade,
    SiteGroupSelectUseCase,
    SiteGroupUseCase,
    TowerTypeSelectFacade,
    TowerTypeSelectUseCase,
} from '@cmz/coverage-areas-application';

/**
 * Composition root du module : wire les ports domaine à leurs implémentations
 * `data`, scopée à l'injecteur de route (`app.routes.ts`, `loadChildren`).
 *
 * OPS-25bis (2026-08-21) : même correctif que `provideAuthentication()` —
 * chaque `XxxUseCase`/`XxxFacade` est passé à
 * `@Service({ autoProvided: false })` (voir leurs docstrings respectifs) et
 * fourni explicitement ci-dessous, dans le même injecteur que son
 * `Repository`, pour que toute la chaîne Facade → UseCase → Repository
 * résolve dans l'injecteur enfant de la route, jamais dans le root.
 */
export function provideCoverageAreas(): Provider[] {
    return [
        { provide: SiteGroupRepository, useClass: SiteGroupRepositoryImpl },
        {
            provide: SiteGroupFindOneRepository,
            useClass: SiteGroupFindOneRepositoryImpl,
        },
        {
            provide: SiteGroupSelectRepository,
            useClass: SiteGroupSelectRepositoryImpl,
        },
        {
            provide: MobileNetworkRepository,
            useClass: MobileNetworkRepositoryImpl,
        },
        {
            provide: MobileNetworkFindOneRepository,
            useClass: MobileNetworkFindOneRepositoryImpl,
        },
        {
            provide: TowerTypeSelectRepository,
            useClass: TowerTypeSelectRepositoryImpl,
        },
        {
            provide: OpticalFiberNetworkRepository,
            useClass: OpticalFiberNetworkRepositoryImpl,
        },
        {
            provide: OpticalFiberNetworkFindOneRepository,
            useClass: OpticalFiberNetworkFindOneRepositoryImpl,
        },
        {
            provide: OpticalFiberNetworkSelectRepository,
            useClass: OpticalFiberNetworkSelectRepositoryImpl,
        },
        {
            provide: FiberConstructorSelectRepository,
            useClass: FiberConstructorSelectRepositoryImpl,
        },
        {
            provide: RadioRelayLinksRepository,
            useClass: RadioRelayLinksRepositoryImpl,
        },
        {
            provide: RadioRelayLinksFindOneRepository,
            useClass: RadioRelayLinksFindOneRepositoryImpl,
        },
        {
            provide: RadioRelayLinksSelectRepository,
            useClass: RadioRelayLinksSelectRepositoryImpl,
        },
        SiteGroupUseCase,
        SiteGroupFindOneUseCase,
        SiteGroupSelectUseCase,
        SiteGroupFacade,
        SiteGroupFindOneFacade,
        SiteGroupSelectFacade,
        MobileNetworkUseCase,
        MobileNetworkFindOneUseCase,
        MobileNetworkSelectUseCase,
        TowerTypeSelectUseCase,
        MobileNetworkFacade,
        MobileNetworkFindOneFacade,
        MobileNetworkSelectFacade,
        TowerTypeSelectFacade,
        OpticalFiberNetworkUseCase,
        OpticalFiberNetworkFindOneUseCase,
        OpticalFiberNetworkSelectUseCase,
        FiberConstructorSelectUseCase,
        OpticalFiberNetworkFacade,
        OpticalFiberNetworkFindOneFacade,
        OpticalFiberNetworkSelectFacade,
        FiberConstructorSelectFacade,
        RadioRelayLinksUseCase,
        RadioRelayLinksFindOneUseCase,
        RadioRelayLinksSelectUseCase,
        RadioRelayLinksFacade,
        RadioRelayLinksFindOneFacade,
        RadioRelayLinksSelectFacade,
    ];
}
