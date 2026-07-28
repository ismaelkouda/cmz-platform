import { PrivacyPolicyStatus } from '../enums/privacy-policy-status.enum';

export interface PrivacyPolicyProps {
    uniqId: string;
    version: string;
    status: PrivacyPolicyStatus;
    createdAt: string;
    publishedAt: string;
    updatedAt: string;
}
