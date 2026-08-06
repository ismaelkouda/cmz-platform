import { Component, computed, input, inject } from '@angular/core';
import { ReportStatesDetailsEntity } from '@cmz/report-states-domain';
import { TranslationPort } from '@cmz/shared-application';

const T = 'REQUESTS.DETAILS';

@Component({
    selector: 'cmz-report-states-details-photos-panel',
    template: `
        @if (photoUrls().length === 0) {
            <p class="text-sm text-muted">{{ t(T + '.PHOTOS.EMPTY') }}</p>
        } @else {
            <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                @for (url of photoUrls(); track url) {
                    <li>
                        <img
                            [src]="url"
                            [alt]="t(T + '.PHOTOS.ALT')"
                            class="max-h-48 w-full rounded border border-border object-cover"
                        />
                    </li>
                }
            </ul>
        }
    `,
})
export class ReportStatesDetailsPhotosPanelComponent {
    protected readonly T = T;

    readonly details = input.required<ReportStatesDetailsEntity>();

    private readonly i18n = inject(TranslationPort);

    protected readonly photoUrls = computed(() => {
        const entity = this.details();
        const urls = [
            entity.placePhoto,
            entity.accessPlacePhoto,
            entity.media?.placePhoto,
            entity.media?.accessPlacePhoto,
        ].filter((url): url is string => !!url?.trim());

        return [...new Set(urls)];
    });

    protected t(key: string): string {
        return this.i18n.translate(key);
    }
}
