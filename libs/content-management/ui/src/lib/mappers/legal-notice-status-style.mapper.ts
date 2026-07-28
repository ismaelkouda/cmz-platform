import { LegalNoticeStatus } from '@cmz/content-management-domain';
import { LegalNoticeStatusStyle } from '../enums/legal-notice-status-style.enum';

/** Traduit un `LegalNoticeStatus` (domaine) en style d'affichage — logique UI. */
export function legalNoticeStatusStyleOf(
    status: LegalNoticeStatus
): LegalNoticeStatusStyle {
    return status === LegalNoticeStatus.PUBLISH
        ? LegalNoticeStatusStyle.PUBLISH
        : LegalNoticeStatusStyle.UNPUBLISH;
}
