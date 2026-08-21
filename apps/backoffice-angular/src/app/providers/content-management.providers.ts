import { Provider } from '@angular/core';
import {
    HomeFindOneRepository,
    HomeRepository,
    LegalNoticeFindOneRepository,
    LegalNoticeRepository,
    NewsCategoriesSelectRepository,
    NewsFindOneRepository,
    NewsRepository,
    PrivacyPolicyFindOneRepository,
    PrivacyPolicyRepository,
    SlideFindOneRepository,
    SlideRepository,
    TermsUseFindOneRepository,
    TermsUseRepository,
} from '@cmz/content-management-domain';
import {
    HomeFindOneRepositoryImpl,
    HomeRepositoryImpl,
    LegalNoticeFindOneRepositoryImpl,
    LegalNoticeRepositoryImpl,
    NewsCategoriesSelectRepositoryImpl,
    NewsFindOneRepositoryImpl,
    NewsRepositoryImpl,
    PrivacyPolicyFindOneRepositoryImpl,
    PrivacyPolicyRepositoryImpl,
    SlideFindOneRepositoryImpl,
    SlideRepositoryImpl,
    TermsUseFindOneRepositoryImpl,
    TermsUseRepositoryImpl,
} from '@cmz/content-management-data';
import {
    HomeFacade,
    HomeFindOneFacade,
    HomeFindOneUseCase,
    HomeUseCase,
    LegalNoticeFacade,
    LegalNoticeFindOneFacade,
    LegalNoticeFindOneUseCase,
    LegalNoticeUseCase,
    NewsCategoriesSelectFacade,
    NewsCategoriesSelectUseCase,
    NewsFacade,
    NewsFindOneFacade,
    NewsFindOneUseCase,
    NewsUseCase,
    PrivacyPolicyFacade,
    PrivacyPolicyFindOneFacade,
    PrivacyPolicyFindOneUseCase,
    PrivacyPolicyUseCase,
    SlideFacade,
    SlideFindOneFacade,
    SlideFindOneUseCase,
    SlideUseCase,
    TermsUseFacade,
    TermsUseFindOneFacade,
    TermsUseFindOneUseCase,
    TermsUseUseCase,
} from '@cmz/content-management-application';

/**
 * Composition root du module `content-management` : wire les ports domaine
 * (6 entités + concept select `news-categories`) à leurs implémentations
 * `data`. À fournir au niveau app, même précédent que
 * `provideTeamOrganization()`.
 *
 * OPS-25bis (2026-08-21) : les 6 variantes "*Select" (`HomeSelectUseCase`/
 * `HomeSelectFacade`, `LegalNoticeSelectUseCase`/`LegalNoticeSelectFacade`,
 * `NewsSelectUseCase`/`NewsSelectFacade`,
 * `PrivacyPolicySelectUseCase`/`PrivacyPolicySelectFacade`,
 * `SlideSelectUseCase`/`SlideSelectFacade`,
 * `TermsUseSelectUseCase`/`TermsUseSelectFacade`) restent volontairement
 * `@Service()` (root) et absentes de ce tableau — leurs repositories
 * (`HomeSelectRepository`, etc.) n'ont aucun provider nulle part dans le
 * repo (ni ici ni dans `app.config.ts`) et ces 12 classes n'ont aucun
 * consommateur UI (audit du repo, 2026-08-21) : code mort pré-existant,
 * hors périmètre de ce correctif. Ne pas les scoper artificiellement sans
 * fournir aussi leur repository. (`NewsCategoriesSelectUseCase`/Facade sont
 * un cas différent — leur repository EST fourni ci-dessous — et sont donc
 * bien scopés.)
 */
export function provideContentManagement(): Provider[] {
    return [
        { provide: HomeRepository, useClass: HomeRepositoryImpl },
        {
            provide: HomeFindOneRepository,
            useClass: HomeFindOneRepositoryImpl,
        },
        { provide: SlideRepository, useClass: SlideRepositoryImpl },
        {
            provide: SlideFindOneRepository,
            useClass: SlideFindOneRepositoryImpl,
        },
        { provide: NewsRepository, useClass: NewsRepositoryImpl },
        {
            provide: NewsFindOneRepository,
            useClass: NewsFindOneRepositoryImpl,
        },
        {
            provide: NewsCategoriesSelectRepository,
            useClass: NewsCategoriesSelectRepositoryImpl,
        },
        {
            provide: LegalNoticeRepository,
            useClass: LegalNoticeRepositoryImpl,
        },
        {
            provide: LegalNoticeFindOneRepository,
            useClass: LegalNoticeFindOneRepositoryImpl,
        },
        {
            provide: PrivacyPolicyRepository,
            useClass: PrivacyPolicyRepositoryImpl,
        },
        {
            provide: PrivacyPolicyFindOneRepository,
            useClass: PrivacyPolicyFindOneRepositoryImpl,
        },
        { provide: TermsUseRepository, useClass: TermsUseRepositoryImpl },
        {
            provide: TermsUseFindOneRepository,
            useClass: TermsUseFindOneRepositoryImpl,
        },
        HomeUseCase,
        HomeFindOneUseCase,
        SlideUseCase,
        SlideFindOneUseCase,
        NewsUseCase,
        NewsFindOneUseCase,
        NewsCategoriesSelectUseCase,
        LegalNoticeUseCase,
        LegalNoticeFindOneUseCase,
        PrivacyPolicyUseCase,
        PrivacyPolicyFindOneUseCase,
        TermsUseUseCase,
        TermsUseFindOneUseCase,
        HomeFacade,
        HomeFindOneFacade,
        SlideFacade,
        SlideFindOneFacade,
        NewsFacade,
        NewsFindOneFacade,
        NewsCategoriesSelectFacade,
        LegalNoticeFacade,
        LegalNoticeFindOneFacade,
        PrivacyPolicyFacade,
        PrivacyPolicyFindOneFacade,
        TermsUseFacade,
        TermsUseFindOneFacade,
    ];
}
