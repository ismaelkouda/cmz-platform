import { NewsStatus } from '../enums/news-status.enum';

export interface NewsFilterContract {
    search?: string;
    status?: NewsStatus;
    startDate?: Date;
    endDate?: Date;
}
