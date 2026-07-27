import { Operator } from '../enums/mobile-network-operator.enum';

/**
 * Filtre de liste `optical-fiber-network` — recherche libre + opérateur +
 * plage de dates. Aucun champ requis (même décision que `site-group`/
 * `mobile-network`).
 */
export interface OpticalFiberNetworkFilterContract {
    search?: string;
    operator?: Operator;
    startDate?: Date;
    endDate?: Date;
}
