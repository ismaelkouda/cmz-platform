import { LegalNoticeStatus } from '../enums/legal-notice-status.enum';

export interface LegalNoticeFindOneProps {
    uniqId: string;
    version: string;
    status: LegalNoticeStatus;
    content: string;
    createdAt: string;
    updatedAt: string;
}
