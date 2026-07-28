import { PrivacyPolicyStatus } from '../enums/privacy-policy-status.enum';

export interface PrivacyPolicyFindOneProps {
    uniqId: string;
    version: string;
    status: PrivacyPolicyStatus;
    content: string;
    createdAt: string;
    updatedAt: string;
}
