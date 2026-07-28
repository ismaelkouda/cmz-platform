import { Platform, TypeMedia } from '@cmz/shared-domain';
import { SlideStatus } from '../enums/slide-status.enum';

export interface SlideProps {
    uniqId: string;
    type: TypeMedia;
    title: string;
    subtitle: string;
    order: number;
    platforms: Platform[];
    status: SlideStatus;
    createdAt: string;
    updatedAt: string;
}
