import { RadioRelayLinksOperator } from '../enums/radio-relay-links-operator.enum';

/**
 * Filtre `radio-relay-links` — `search`/`operator`/plage de dates. Le
 * formulaire source expose aussi un champ `frequency`, mais il n'est **pas**
 * relayé au contrat wire (`RadioRelayLinksFilterContract` du source n'a pas
 * ce champ) — incohérence UI/contrat du source, non reproduite ici : fidélité
 * au contrat réellement envoyé à l'API, pas au formulaire.
 */
export interface RadioRelayLinksFilterContract {
    search?: string;
    operator?: RadioRelayLinksOperator;
    startDate?: Date;
    endDate?: Date;
}
