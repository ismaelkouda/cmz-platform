import { TermsUseStatus } from '../enums/terms-use-status.enum';

export interface TermsUseFilterContract {
    search?: string;
    version?: string;
    status?: TermsUseStatus;
    startDate?: Date;
    endDate?: Date;
}
