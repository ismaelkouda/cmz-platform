import { Operator } from '../enums/mobile-network-operator.enum';
import { Technology } from '../enums/mobile-network-technology.enum';

export interface MobileNetworkFindOneProps {
    uniqId: string;
    siteId: string;
    siteName: string;
    /**
     * Champ nommé `infrastructureType` fidèlement au source, mais porte en
     * réalité l'uniqId du `site-group` sélectionné dans le formulaire (le
     * `p-select` source est bindé sur `SiteGroupSelectFacade`, pas sur un
     * concept "type d'infrastructure"). Nom conservé pour la fidélité du
     * contrat wire (`infrastructure_type`), incohérence du source documentée
     * ici plutôt que silencieusement reproduite sans commentaire.
     */
    infrastructureType: string;
    towerTypeId: string;
    towerTypeName: string;
    towerSize: number;
    technology: Technology[];
    operator: Operator;
    radius?: number;
    updatedAt: string;
}
