import { Platform } from '@cmz/shared-domain';
import { HomeStatus } from '../enums/home-status.enum';

export interface HomeFilterContract {
    search?: string;
    platforms?: Platform[];
    status?: HomeStatus;
    startDate?: Date;
    endDate?: Date;
}
