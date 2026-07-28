import { Platform } from '@cmz/shared-domain';

export interface HomeCreateContract {
    title?: string;
    resume?: string;
    content?: string;
    image?: File | null | string;
    platforms?: Platform[];
    startDate?: string;
    endDate?: string;
    buttonLabel?: string;
    buttonUrl?: string;
}
