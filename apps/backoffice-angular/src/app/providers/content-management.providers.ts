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

/**
 * Composition root du module `content-management` : wire les ports domaine
 * (6 entités + concept select `news-categories`) à leurs implémentations
 * `data`. À fournir au niveau app, même précédent que
 * `provideTeamOrganization()`.
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
    ];
}
