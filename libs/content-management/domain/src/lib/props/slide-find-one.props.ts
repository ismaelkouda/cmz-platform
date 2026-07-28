import { Platform, TypeMedia } from '@cmz/shared-domain';
import { SlideStatus } from '../enums/slide-status.enum';

export interface SlideFindOneProps {
    uniqId: string;
    status: SlideStatus;
    order: number;
    timeDuration: number;
    type: TypeMedia;
    image: string;
    video: string;
    platforms: Platform[];
    startDate: Date;
    endDate: Date;
    title: string;
    subtitle: string;
    content: string;
    buttonLabel: string;
    buttonUrl: string;
    createdAt: string;
    updatedAt: string;
}
