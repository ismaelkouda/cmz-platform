import { Injectable, signal } from '@angular/core';
import {
    MobileNetworkFilterContract,
    isTechnology,
    Operator,
} from '@cmz/coverage-areas-domain';
import { MOBILE_NETWORK_FILTER_KEYS } from '../constants/mobile-network-filter-keys.constant';

/**
 * Store de filtre `mobile-network` — signal-first, même forme que
 * `SiteGroupFilterStore`. `towerSize`/`radius` restent des chaînes dans le
 * modèle (comme `startDate`/`endDate`) et sont converties en nombre au
 * passage au contrat.
 */
@Injectable()
export class MobileNetworkFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [MOBILE_NETWORK_FILTER_KEYS.SEARCH]: '',
            [MOBILE_NETWORK_FILTER_KEYS.TOWER_TYPE_ID]: '',
            [MOBILE_NETWORK_FILTER_KEYS.TOWER_SIZE]: '',
            [MOBILE_NETWORK_FILTER_KEYS.TECHNOLOGY]: '',
            [MOBILE_NETWORK_FILTER_KEYS.OPERATOR]: '',
            [MOBILE_NETWORK_FILTER_KEYS.RADIUS]: '',
            [MOBILE_NETWORK_FILTER_KEYS.START_DATE]: '',
            [MOBILE_NETWORK_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): MobileNetworkFilterContract {
        const m = this.model();
        const start = m[MOBILE_NETWORK_FILTER_KEYS.START_DATE];
        const end = m[MOBILE_NETWORK_FILTER_KEYS.END_DATE];
        const technology = m[MOBILE_NETWORK_FILTER_KEYS.TECHNOLOGY];
        const operator = m[MOBILE_NETWORK_FILTER_KEYS.OPERATOR];
        const towerSize = m[MOBILE_NETWORK_FILTER_KEYS.TOWER_SIZE];
        const radius = m[MOBILE_NETWORK_FILTER_KEYS.RADIUS];
        return {
            search: m[MOBILE_NETWORK_FILTER_KEYS.SEARCH] || undefined,
            towerTypeId:
                m[MOBILE_NETWORK_FILTER_KEYS.TOWER_TYPE_ID] || undefined,
            towerSize: towerSize ? Number(towerSize) : undefined,
            technology: isTechnology(technology) ? technology : undefined,
            operator: Object.values(Operator).includes(operator as Operator)
                ? (operator as Operator)
                : undefined,
            radius: radius ? Number(radius) : undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
