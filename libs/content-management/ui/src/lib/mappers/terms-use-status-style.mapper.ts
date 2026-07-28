import { TermsUseStatus } from '@cmz/content-management-domain';
import { TermsUseStatusStyle } from '../enums/terms-use-status-style.enum';

/** Traduit un `TermsUseStatus` (domaine) en style d'affichage — logique UI. */
export function termsUseStatusStyleOf(
    status: TermsUseStatus
): TermsUseStatusStyle {
    return status === TermsUseStatus.PUBLISH
        ? TermsUseStatusStyle.PUBLISH
        : TermsUseStatusStyle.UNPUBLISH;
}
