import { Platform, TypeMedia } from '@cmz/shared-domain';

export interface SlideUpdateContract {
    uniqId?: string;
    timeDuration?: number;
    type?: TypeMedia;
    image?: File | null | string;
    video?: string | null;
    platforms?: Platform[];
    startDate?: string;
    endDate?: string;
    title?: string;
    subtitle?: string;
    content?: string;
    buttonLabel?: string;
    buttonUrl?: string;
}
