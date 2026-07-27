import { Operator } from '../enums/mobile-network-operator.enum';
import { FiberType } from '../enums/optical-fiber-network-type.enum';

export interface OpticalFiberNetworkUpdateValidateContract {
    uniqId: string;
    name: string;
    operator: Operator;
    fiberConstructorId: string;
    type: FiberType;
    /** Optionnel en update : fidèle au source, ne pas forcer un ré-upload. */
    geomFile?: File;
}
