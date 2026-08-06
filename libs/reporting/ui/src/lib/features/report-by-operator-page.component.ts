import { Component, computed, inject } from '@angular/core';
import { ReportByOperatorFacade } from '@cmz/reporting-application';
import { GrafanaEmbedComponent } from '@cmz/shared-ui';

const T = 'REPORTING.REPORT_BY_OPERATOR';

@Component({
    selector: 'cmz-report-by-operator-page',
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
export class ReportByOperatorPageComponent {
    protected readonly facade = inject(ReportByOperatorFacade);
    protected readonly hasError = computed(() => !!this.facade.error());

    constructor() {
        this.facade.load();
    }
}
