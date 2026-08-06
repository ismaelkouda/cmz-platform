import { Component, input, output, inject } from '@angular/core';
import { ReportStatesDetailsEntity } from '@cmz/report-states-domain';
import { TranslationPort } from '@cmz/shared-application';
import { REPORT_SOURCE_LABEL } from '@cmz/shared-ui';
import { REPORT_STATES_DETAILS_STATUS_BADGE_CLASS } from '../constants/report-states-details-status-badge.constant';
import { REPORT_STATES_DETAILS_STATUS_LABEL } from '../constants/report-states-details-status-label.constant';

@Component({
    selector: 'cmz-report-states-details-header',
    template: `
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            @if (loading()) {
                <span class="text-muted">{{ t('COMMON.LOADING') }}</span>
            } @else if (details(); as item) {
                <span class="text-base font-semibold text-text">
                    {{ t(item.titleKey) }}
                    {{ t('MANAGEMENT.HEADER.DETAILS_DEMAND') }}
                </span>

                <button
                    type="button"
                    class="rounded px-1 font-mono text-sm text-primary hover:bg-surface-hover"
                    [title]="t('COMMON.COPY')"
                    (click)="copyRequested.emit(item.uniqId)"
                >
                    [ {{ item.uniqId }} ]
                </button>

                <span class="text-muted">
                    {{ t('MANAGEMENT.FORM.REPORT_INFO.TRANSMISSION_CHANNEL') }}
                </span>
                <button
                    type="button"
                    class="rounded px-1 text-sm hover:bg-surface-hover"
                    [title]="t('COMMON.COPY')"
                    (click)="copyRequested.emit(sourceLabel(item))"
                >
                    [ {{ sourceLabel(item) }} ]
                </button>

                <span class="text-muted">
                    {{ t('MANAGEMENT.FORM.REPORT_INFO.STATUS') }}
                </span>
                <span
                    class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                    [class]="statusBadgeClass(item)"
                >
                    {{ statusLabel(item) }}
                </span>

                <span class="text-muted">
                    {{ t('MANAGEMENT.HEADER.NUMBER_OF_CONFIRMATIONS') }}
                    [ {{ item.confirmCount }} ]
                </span>
            }
        </div>
    `,
})
export class ReportStatesDetailsHeaderComponent {
    readonly details = input<ReportStatesDetailsEntity | null>(null);
    readonly loading = input(false);

    readonly copyRequested = output<string>();

    private readonly i18n = inject(TranslationPort);

    protected sourceLabel(item: ReportStatesDetailsEntity): string {
        return this.t(REPORT_SOURCE_LABEL[item.source]);
    }

    protected statusLabel(item: ReportStatesDetailsEntity): string {
        return this.t(REPORT_STATES_DETAILS_STATUS_LABEL[item.status]);
    }

    protected statusBadgeClass(item: ReportStatesDetailsEntity): string {
        return REPORT_STATES_DETAILS_STATUS_BADGE_CLASS[item.status];
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }
}
