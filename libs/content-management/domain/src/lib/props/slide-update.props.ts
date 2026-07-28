import { DatePeriod, Platform, TypeMedia } from '@cmz/shared-domain';

export interface SlideUpdateProps {
    uniqId: string;
    timeDuration: number;
    type: TypeMedia;
    image: File | null | string;
    video: string | null;
    platforms: Platform[];
    period: DatePeriod;
    title: string;
    subtitle: string;
    content: string;
    buttonLabel?: string;
    buttonUrl?: string;
}
