import { Component, computed, inject } from '@angular/core';
import { ReportByChannelFacade } from '@cmz/reporting-application';
import { GrafanaEmbedComponent } from '@cmz/shared-ui';

const T = 'REPORTING.REPORT_BY_CHANNEL';

@Component({
    selector: 'cmz-report-by-channel-page',
    imports: [GrafanaEmbedComponent],
    template: `
        <cmz-grafana-embed
            [grafanaLink]="facade.value()?.grafanaLink"
            titleKey="${T}.TITLE"
            loadingLabelKey="${T}.LOADING_DESCRIPTION"
            errorLabelKey="${T}.ERROR_DESCRIPTION"
            [loading]="facade.isLoading()"
            [error]="hasError()"
            (refresh)="facade.reload()"
        />
    `,
})
export class ReportByChannelPageComponent {
    protected readonly facade = inject(ReportByChannelFacade);
    protected readonly hasError = computed(() => !!this.facade.error());

    constructor() {
        this.facade.load();
    }
}
