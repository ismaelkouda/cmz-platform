import { Component, input, inject } from '@angular/core';
import { RequestsDetailsEntity } from '@cmz/requests-domain';
import {
    REPORT_SOURCE_LABEL,
    REPORT_TYPE_LABEL,
    TELECOM_OPERATOR_LABEL,
} from '@cmz/shared-ui';
import { REQUESTS_DETAILS_STATUS_LABEL } from '../constants/requests-details-status-label.constant';
import { TranslocoService } from '@jsverse/transloco';

const T = 'REQUESTS.DETAILS';

@Component({
    selector: 'cmz-requests-details-info-panel',
    template: `
        <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
            <dt class="text-muted">{{ t(T + '.UNIQ_ID') }}</dt>
            <dd>{{ details().uniqId }}</dd>

            <dt class="text-muted">{{ t(T + '.STATUS_FIELD') }}</dt>
            <dd>{{ statusLabel() }}</dd>

            <dt class="text-muted">{{ t(T + '.REPORT_TYPE') }}</dt>
            <dd>{{ reportTypeLabel() }}</dd>

            <dt class="text-muted">{{ t(T + '.OPERATORS') }}</dt>
            <dd>{{ operatorsLabel() }}</dd>

            <dt class="text-muted">{{ t(T + '.SOURCE') }}</dt>
            <dd>{{ sourceLabel() }}</dd>

            <dt class="text-muted">{{ t(T + '.INITIATOR') }}</dt>
            <dd>{{ details().initiatorPhone }}</dd>

            <dt class="text-muted">{{ t(T + '.REPORTED_AT') }}</dt>
            <dd>{{ details().reportedAt }}</dd>

            @if (details().location.name) {
                <dt class="text-muted">{{ t(T + '.LOCATION_NAME') }}</dt>
                <dd>{{ details().location.name }}</dd>
            }

            @if (regionLabel()) {
                <dt class="text-muted">{{ t(T + '.REGION') }}</dt>
                <dd>{{ regionLabel() }}</dd>
            }

            @if (departmentLabel()) {
                <dt class="text-muted">{{ t(T + '.DEPARTMENT') }}</dt>
                <dd>{{ departmentLabel() }}</dd>
            }

            @if (municipalityLabel()) {
                <dt class="text-muted">{{ t(T + '.MUNICIPALITY') }}</dt>
                <dd>{{ municipalityLabel() }}</dd>
            }

            @if (details().placeDescription) {
                <dt class="text-muted">{{ t(T + '.PLACE_DESCRIPTION') }}</dt>
                <dd>{{ details().placeDescription }}</dd>
            }

            @if (details().description) {
                <dt class="text-muted">{{ t(T + '.DESCRIPTION') }}</dt>
                <dd class="col-span-1">{{ details().description }}</dd>
            }
        </dl>
    `,
})
export class RequestsDetailsInfoPanelComponent {
    protected readonly T = T;

    readonly details = input.required<RequestsDetailsEntity>();

    private readonly i18n = inject(TranslocoService);

    protected statusLabel(): string {
        const status = this.details().status;
        return this.t(REQUESTS_DETAILS_STATUS_LABEL[status]);
    }

    protected reportTypeLabel(): string {
        return this.t(REPORT_TYPE_LABEL[this.details().reportType]);
    }

    protected operatorsLabel(): string {
        return this.details()
            .operators.map((op) => this.t(TELECOM_OPERATOR_LABEL[op]))
            .join(', ');
    }

    protected sourceLabel(): string {
        return this.t(REPORT_SOURCE_LABEL[this.details().source]);
    }

    protected regionLabel(): string {
        return this.details().region?.name ?? '';
    }

    protected departmentLabel(): string {
        return this.details().department?.name ?? '';
    }

    protected municipalityLabel(): string {
        return this.details().municipality?.name ?? '';
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }
}
