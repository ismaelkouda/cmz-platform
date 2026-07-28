import { Platform } from '@cmz/shared-domain';
import { HomeStatus } from '../enums/home-status.enum';

export interface HomeProps {
    uniqId: string;
    title: string;
    resume: string;
    image: string;
    order: number;
    platforms: Platform[];
    status: HomeStatus;
    createdAt: string;
    updatedAt: string;
}
