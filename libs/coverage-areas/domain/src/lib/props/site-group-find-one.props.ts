import { Status } from '../enums/status.enum';

export interface SiteGroupFindOneProps {
    uniqId: string;
    code: string;
    name: string;
    description: string;
    status: Status;
    updatedAt: string;
}
