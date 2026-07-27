import { Status } from '../enums/status.enum';
import { Operator } from '../enums/mobile-network-operator.enum';
import { Technology } from '../enums/mobile-network-technology.enum';

export interface MobileNetworkProps {
    uniqId: string;
    siteId: string;
    siteName: string;
    towerTypeId: string;
    towerTypeName: string;
    towerSize: number;
    technology: Technology[];
    operator: Operator;
    radius?: number;
    status: Status;
    updatedAt: string;
}
