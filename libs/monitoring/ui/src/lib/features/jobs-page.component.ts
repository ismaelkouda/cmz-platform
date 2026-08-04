import { Component, computed, inject } from '@angular/core';
import { JobsFacade } from '@cmz/monitoring-application';
import { GrafanaEmbedComponent } from '@cmz/shared-ui';

const T = 'MONITORING.JOBS';

/**
 * Le source utilisait le namespace i18n `REPORTING.JOBS.*` pour cette page,
 * alors qu'elle vit structurellement dans l'arbre de routes `monitoring`
 * (même `monitoring.routes.ts`, mêmes providers `monitoring.providers.ts`)
 * — une incohérence de nommage, pas une frontière de module réelle.
 * Alignée ici sur `MONITORING.JOBS.*`, cohérent avec l'emplacement réel.
 */
@Component({
    selector: 'cmz-jobs-page',
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
export class JobsPageComponent {
    protected readonly facade = inject(JobsFacade);
    protected readonly hasError = computed(() => !!this.facade.error());

    constructor() {
        this.facade.load();
    }
}
