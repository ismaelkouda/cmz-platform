import { Operator } from '../enums/mobile-network-operator.enum';
import { FiberType } from '../enums/optical-fiber-network-type.enum';

export interface OpticalFiberNetworkFindOneProps {
    uniqId: string;
    name: string;
    operator: Operator;
    fiberConstructorId: string;
    fiberConstructorName: string;
    type: FiberType;
    /**
     * Tracé géographique de la fibre (GeoJSON), fourni par le fichier uploadé
     * à la création/mise à jour. `geomUrl` (fichier stocké) ou `geom` (déjà
     * parsé) selon ce que renvoie l'API — cf. mapper.
     */
    geomUrl?: string;
    geom?: object;
    updatedAt: string;
}
