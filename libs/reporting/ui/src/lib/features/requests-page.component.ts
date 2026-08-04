import { Component, computed, inject } from '@angular/core';
import { RequestsFacade } from '@cmz/reporting-application';
import { GrafanaEmbedComponent } from '@cmz/shared-ui';

const T = 'REPORTING.REQUESTS';

@Component({
    selector: 'cmz-requests-page',
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
export class RequestsPageComponent {
    protected readonly facade = inject(RequestsFacade);
    protected readonly hasError = computed(() => !!this.facade.error());

    constructor() {
        this.facade.load();
    }
}
