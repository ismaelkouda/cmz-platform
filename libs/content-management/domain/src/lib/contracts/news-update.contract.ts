import { TypeMedia } from '@cmz/shared-domain';

export interface NewsUpdateContract {
    uniqId?: string;
    type?: TypeMedia;
    image?: File | null | string;
    video?: string | null;
    category?: string;
    subCategory?: string;
    hashtags?: string[];
    title?: string;
    resume?: string;
    content?: string;
}
