import { Operator } from '../enums/mobile-network-operator.enum';
import { Technology } from '../enums/mobile-network-technology.enum';

export interface MobileNetworkCreateContract {
    siteId?: string;
    siteName?: string;
    infrastructureType?: string;
    towerTypeId?: string;
    towerSize?: number;
    technology?: Technology[];
    operator?: Operator;
    radius?: number;
}
