import { Operator } from '../enums/mobile-network-operator.enum';
import { FiberType } from '../enums/optical-fiber-network-type.enum';

export interface OpticalFiberNetworkCreateValidateContract {
    name: string;
    operator: Operator;
    fiberConstructorId: string;
    type: FiberType;
    geomFile: File;
}
