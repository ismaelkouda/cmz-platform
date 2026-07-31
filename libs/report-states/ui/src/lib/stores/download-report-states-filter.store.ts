import { Injectable, signal } from '@angular/core';
import {
    DownloadReportStatesFilterContract,
    DownloadReportStatesStatus,
} from '@cmz/report-states-domain';
import { DOWNLOAD_REPORT_STATES_FILTER_KEYS } from '../constants/download-report-states-filter-keys.constant';

@Injectable()
export class DownloadReportStatesFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [DOWNLOAD_REPORT_STATES_FILTER_KEYS.SEARCH]: '',
            [DOWNLOAD_REPORT_STATES_FILTER_KEYS.STATUS]: '',
            [DOWNLOAD_REPORT_STATES_FILTER_KEYS.DATE]: '',
        };
    }

    toContract(): DownloadReportStatesFilterContract {
        const m = this.model();
        const statusRaw = m[DOWNLOAD_REPORT_STATES_FILTER_KEYS.STATUS];
        const dateRaw = m[DOWNLOAD_REPORT_STATES_FILTER_KEYS.DATE];
        const status = statusRaw
            ? (statusRaw as DownloadReportStatesStatus)
            : undefined;

        return {
            search: m[DOWNLOAD_REPORT_STATES_FILTER_KEYS.SEARCH] || undefined,
            status,
            date: dateRaw ? new Date(dateRaw) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
