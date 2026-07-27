import { Status } from '../enums/status.enum';
/**
 * `Operator` réutilisé depuis `mobile-network` (mêmes valeurs `MTN`/`Orange`/
 * `Moov` — un opérateur télécom, pas un concept propre à `optical-fiber-network`)
 * — même logique que `Status`/`StatusStyle` partagés une fois par lib. Dette de
 * nommage (fichier préfixé `mobile-network`) déjà documentée pour ce même enum.
 */
import { Operator } from '../enums/mobile-network-operator.enum';
import { FiberType } from '../enums/optical-fiber-network-type.enum';

export interface OpticalFiberNetworkProps {
    uniqId: string;
    name: string;
    operator: Operator;
    fiberConstructorId: string;
    fiberConstructorName: string;
    type: FiberType;
    status: Status;
    updatedAt: string;
}
