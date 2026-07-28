import { PrivacyPolicyStatus } from '@cmz/content-management-domain';
import { PrivacyPolicyStatusStyle } from '../enums/privacy-policy-status-style.enum';

/** Traduit un `PrivacyPolicyStatus` (domaine) en style d'affichage — logique UI. */
export function privacyPolicyStatusStyleOf(
    status: PrivacyPolicyStatus
): PrivacyPolicyStatusStyle {
    return status === PrivacyPolicyStatus.PUBLISH
        ? PrivacyPolicyStatusStyle.PUBLISH
        : PrivacyPolicyStatusStyle.UNPUBLISH;
}
