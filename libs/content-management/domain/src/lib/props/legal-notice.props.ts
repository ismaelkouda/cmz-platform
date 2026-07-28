import { LegalNoticeStatus } from '../enums/legal-notice-status.enum';

export interface LegalNoticeProps {
    uniqId: string;
    version: string;
    status: LegalNoticeStatus;
    createdAt: string;
    publishedAt: string;
    updatedAt: string;
}
