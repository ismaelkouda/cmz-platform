import { Injectable, signal } from '@angular/core';
import {
    OpticalFiberNetworkFilterContract,
    Operator,
} from '@cmz/coverage-areas-domain';
import { OPTICAL_FIBER_NETWORK_FILTER_KEYS } from '../constants/optical-fiber-network-filter-keys.constant';

/**
 * Store de filtre `optical-fiber-network` — même forme signal-first que
 * `SiteGroupFilterStore`/`MobileNetworkFilterStore`.
 */
@Injectable()
export class OpticalFiberNetworkFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [OPTICAL_FIBER_NETWORK_FILTER_KEYS.SEARCH]: '',
            [OPTICAL_FIBER_NETWORK_FILTER_KEYS.OPERATOR]: '',
            [OPTICAL_FIBER_NETWORK_FILTER_KEYS.START_DATE]: '',
            [OPTICAL_FIBER_NETWORK_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): OpticalFiberNetworkFilterContract {
        const m = this.model();
        const start = m[OPTICAL_FIBER_NETWORK_FILTER_KEYS.START_DATE];
        const end = m[OPTICAL_FIBER_NETWORK_FILTER_KEYS.END_DATE];
        const operator = m[OPTICAL_FIBER_NETWORK_FILTER_KEYS.OPERATOR];
        return {
            search: m[OPTICAL_FIBER_NETWORK_FILTER_KEYS.SEARCH] || undefined,
            operator: Object.values(Operator).includes(operator as Operator)
                ? (operator as Operator)
                : undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
