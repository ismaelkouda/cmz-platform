import { LegalNoticeStatus } from '../enums/legal-notice-status.enum';

export interface LegalNoticeFilterContract {
    search?: string;
    version?: string;
    status?: LegalNoticeStatus;
    startDate?: Date;
    endDate?: Date;
}
