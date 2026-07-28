import { PrivacyPolicyStatus } from '../enums/privacy-policy-status.enum';

export interface PrivacyPolicyFilterContract {
    search?: string;
    version?: string;
    status?: PrivacyPolicyStatus;
    startDate?: Date;
    endDate?: Date;
}
