import { PrivacyPolicyStatus } from '@cmz/content-management-domain';

/** Clés i18n des libellés de statut privacy-policy — présentation pure. */
export const PRIVACY_POLICY_STATUS_LABEL: Record<PrivacyPolicyStatus, string> =
    {
        [PrivacyPolicyStatus.PUBLISH]: 'COMMON.PUBLISH',
        [PrivacyPolicyStatus.UNPUBLISH]: 'COMMON.UNPUBLISH',
    };
