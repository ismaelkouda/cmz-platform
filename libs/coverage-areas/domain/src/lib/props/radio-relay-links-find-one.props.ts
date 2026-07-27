import { RadioRelayLinksOperator } from '../enums/radio-relay-links-operator.enum';
import { RadioRelayLinksFrequency } from '../enums/radio-relay-links-frequency.enum';

export interface RadioRelayLinksFindOneProps {
    uniqId: string;
    name: string;
    operator: RadioRelayLinksOperator;
    frequency: RadioRelayLinksFrequency;
    startDate: Date;
    endDate: Date;
    updatedAt: string;
    /** Tracé géographique en lecture seule — pas d'upload côté formulaire
     * (contrairement à `optical-fiber-network`), cf. contrats create/update. */
    geomUrl?: string;
    geom?: object;
}
