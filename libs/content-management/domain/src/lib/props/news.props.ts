import { TypeMedia } from '@cmz/shared-domain';
import { NewsStatus } from '../enums/news-status.enum';

export interface NewsProps {
    uniqId: string;
    type: TypeMedia;
    title: string;
    category: string;
    subCategory: string;
    status: NewsStatus;
    createdAt: string;
    updatedAt: string;
}
