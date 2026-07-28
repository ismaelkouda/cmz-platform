import { Platform } from '@cmz/shared-domain';
import { HomeStatus } from '../enums/home-status.enum';

export interface HomeFindOneProps {
    uniqId: string;
    title: string;
    resume: string;
    order: number;
    platforms: Platform[];
    status: HomeStatus;
    content: string;
    image: string;
    timeDurationInSeconds: number;
    buttonLabel: string;
    buttonUrl: string;
    startDate: Date;
    endDate: Date;
    createdAt: string;
    updatedAt: string;
}
