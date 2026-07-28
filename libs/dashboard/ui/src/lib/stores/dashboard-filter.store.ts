import { Injectable, signal } from '@angular/core';
import { DashboardFilterContract, Period } from '@cmz/dashboard-domain';

const INITIAL_PERIOD: Period = Period.NINETY_DAYS;

@Injectable()
export class DashboardFilterStore {
    readonly period = signal<Period>(INITIAL_PERIOD);

    setPeriod(period: Period): void {
        this.period.set(period);
    }

    toContract(): DashboardFilterContract {
        return { period: this.period() };
    }
}
