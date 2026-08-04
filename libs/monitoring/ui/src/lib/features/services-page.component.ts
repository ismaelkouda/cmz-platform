import { Component, computed, inject } from '@angular/core';
import { ServicesFacade } from '@cmz/monitoring-application';
import { GrafanaEmbedComponent } from '@cmz/shared-ui';

const T = 'MONITORING.SERVICES';

@Component({
    selector: 'cmz-services-page',
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
export class ServicesPageComponent {
    protected readonly facade = inject(ServicesFacade);
    protected readonly hasError = computed(() => !!this.facade.error());

    constructor() {
        this.facade.load();
    }
}
