import { Component, input, inject } from '@angular/core';
import { ReportStatesDetailsEntity } from '@cmz/report-states-domain';
import { TranslocoService } from '@jsverse/transloco';

const T = 'REPORT_STATES.DETAILS';

@Component({
    selector: 'cmz-report-states-details-location-panel',
    template: `
        <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
            <dt class="text-muted">{{ t(T + '.LATITUDE') }}</dt>
            <dd>{{ details().location.coordinates.latitude }}</dd>

            <dt class="text-muted">{{ t(T + '.LONGITUDE') }}</dt>
            <dd>{{ details().location.coordinates.longitude }}</dd>

            @if (details().location.description) {
                <dt class="text-muted">{{ t(T + '.LOCATION_DESCRIPTION') }}</dt>
                <dd>{{ details().location.description }}</dd>
            }

            @if (details().placeDescription) {
                <dt class="text-muted">{{ t(T + '.PLACE_DESCRIPTION') }}</dt>
                <dd>{{ details().placeDescription }}</dd>
            }
        </dl>

        @if (mapUrl(); as url) {
            <a
                [href]="url"
                target="_blank"
                rel="noopener noreferrer"
                class="mt-3 inline-block text-sm text-primary underline"
            >
                {{ t(T + '.OPEN_MAP') }}
            </a>
        }
    `,
})
export class ReportStatesDetailsLocationPanelComponent {
    protected readonly T = T;

    readonly details = input.required<ReportStatesDetailsEntity>();

    private readonly i18n = inject(TranslocoService);

    protected mapUrl(): string | null {
        const { latitude, longitude } = this.details().location.coordinates;
        if (latitude == null || longitude == null) {
            return null;
        }
        return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }
}
