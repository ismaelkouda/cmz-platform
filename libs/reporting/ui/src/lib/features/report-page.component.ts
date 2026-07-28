import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { ReportFacade } from '@cmz/reporting-application';
import { GrafanaEmbedComponent } from '@cmz/shared-ui';

const T = 'REPORTING.REPORT';

@Component({
    selector: 'cmz-report-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
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
export class ReportPageComponent {
    protected readonly facade = inject(ReportFacade);
    protected readonly hasError = computed(() => !!this.facade.error());

    constructor() {
        this.facade.load();
    }
}
