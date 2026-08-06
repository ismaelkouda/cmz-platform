import { Component, computed, inject } from '@angular/core';
import { MapFacade } from '@cmz/interactive-map-application';
import { GrafanaEmbedComponent } from '@cmz/shared-ui';

const T = 'INTERACTIVE_MAP.DASHBOARD';

@Component({
    selector: 'cmz-map-page',
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
export class MapPageComponent {
    protected readonly facade = inject(MapFacade);
    protected readonly hasError = computed(() => !!this.facade.error());

    constructor() {
        this.facade.load();
    }
}
