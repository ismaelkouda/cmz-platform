import { TypeMedia } from '@cmz/shared-domain';
import { NewsStatus } from '../enums/news-status.enum';

export interface NewsFindOneProps {
    uniqId: string;
    status: NewsStatus;
    order: number;
    type: TypeMedia;
    image: string;
    video: string;
    category: string;
    subCategory: string;
    hashtags: string[];
    title: string;
    resume: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}
