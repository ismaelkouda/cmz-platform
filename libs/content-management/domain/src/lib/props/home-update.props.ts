import { DatePeriod, Platform } from '@cmz/shared-domain';

export interface HomeUpdateProps {
    uniqId: string;
    image: File | null | string;
    platforms: Platform[];
    period: DatePeriod;
    title: string;
    resume: string;
    content: string;
    buttonLabel?: string;
    buttonUrl?: string;
}
