import { Status } from '../enums/status.enum';

export interface SiteGroupProps {
    uniqId: string;
    code: string;
    name: string;
    description: string;
    status: Status;
    updatedAt: string;
}
