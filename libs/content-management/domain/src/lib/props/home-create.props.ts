import { DatePeriod, Platform } from '@cmz/shared-domain';

export interface HomeCreateProps {
    image: File | null | string;
    platforms: Platform[];
    period: DatePeriod;
    title: string;
    resume: string;
    content: string;
    buttonLabel?: string;
    buttonUrl?: string;
}
