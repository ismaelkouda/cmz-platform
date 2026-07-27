import { Injectable, signal } from '@angular/core';
import {
    RadioRelayLinksFilterContract,
    isRadioRelayLinksOperator,
} from '@cmz/coverage-areas-domain';
import { RADIO_RELAY_LINKS_FILTER_KEYS } from '../constants/radio-relay-links-filter-keys.constant';

/**
 * Store de filtre `radio-relay-links` — signal-first, même forme que
 * `MobileNetworkFilterStore`. Pas de champ `frequency` (cf. constante de
 * clés) : fidélité au contrat wire, pas au formulaire du source.
 */
@Injectable()
export class RadioRelayLinksFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [RADIO_RELAY_LINKS_FILTER_KEYS.SEARCH]: '',
            [RADIO_RELAY_LINKS_FILTER_KEYS.OPERATOR]: '',
            [RADIO_RELAY_LINKS_FILTER_KEYS.START_DATE]: '',
            [RADIO_RELAY_LINKS_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): RadioRelayLinksFilterContract {
        const m = this.model();
        const operator = m[RADIO_RELAY_LINKS_FILTER_KEYS.OPERATOR];
        const start = m[RADIO_RELAY_LINKS_FILTER_KEYS.START_DATE];
        const end = m[RADIO_RELAY_LINKS_FILTER_KEYS.END_DATE];
        return {
            search: m[RADIO_RELAY_LINKS_FILTER_KEYS.SEARCH] || undefined,
            operator: isRadioRelayLinksOperator(operator)
                ? operator
                : undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
