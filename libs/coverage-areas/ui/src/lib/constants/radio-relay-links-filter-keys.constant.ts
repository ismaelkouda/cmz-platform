/**
 * Pas de clé `FREQUENCY` — le formulaire de filtre source en expose une,
 * mais le contrat wire réel (`RadioRelayLinksFilterContract`) ne l'accepte
 * pas (cf. commentaire du contrat en domaine). Fidélité au contrat, pas au
 * formulaire du source.
 */
export const RADIO_RELAY_LINKS_FILTER_KEYS = {
    SEARCH: 'search',
    OPERATOR: 'operator',
    START_DATE: 'startDate',
    END_DATE: 'endDate',
} as const;
