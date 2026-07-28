import { Platform } from '@cmz/shared-domain';
import { SlideStatus } from '../enums/slide-status.enum';

export interface SlideFilterContract {
    search?: string;
    platforms?: Platform[];
    status?: SlideStatus;
    startDate?: Date;
    endDate?: Date;
}
