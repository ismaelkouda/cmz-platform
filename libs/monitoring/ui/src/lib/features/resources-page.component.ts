import { Component, computed, inject } from '@angular/core';
import { ResourcesFacade } from '@cmz/monitoring-application';
import { GrafanaEmbedComponent } from '@cmz/shared-ui';

const T = 'MONITORING.RESOURCES';

@Component({
    selector: 'cmz-resources-page',
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
export class ResourcesPageComponent {
    protected readonly facade = inject(ResourcesFacade);
    protected readonly hasError = computed(() => !!this.facade.error());

    constructor() {
        this.facade.load();
    }
}
