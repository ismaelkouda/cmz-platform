import { TermsUseStatus } from '../enums/terms-use-status.enum';

export interface TermsUseFindOneProps {
    uniqId: string;
    version: string;
    status: TermsUseStatus;
    content: string;
    createdAt: string;
    updatedAt: string;
}
