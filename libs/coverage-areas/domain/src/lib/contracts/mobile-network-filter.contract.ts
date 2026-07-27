import { Operator } from '../enums/mobile-network-operator.enum';
import { Technology } from '../enums/mobile-network-technology.enum';

/**
 * Filtre de liste `mobile-network` — recherche libre + filtres techniques +
 * plage de dates. Aucun champ requis (même décision que `site-group` : le
 * formulaire de filtre source n'impose aucune contrainte).
 */
export interface MobileNetworkFilterContract {
    search?: string;
    towerTypeId?: string;
    towerSize?: number;
    technology?: Technology;
    operator?: Operator;
    radius?: number;
    startDate?: Date;
    endDate?: Date;
}
