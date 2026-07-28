import { TermsUseStatus } from '../enums/terms-use-status.enum';

export interface TermsUseProps {
    uniqId: string;
    version: string;
    status: TermsUseStatus;
    createdAt: string;
    publishedAt: string;
    updatedAt: string;
}
