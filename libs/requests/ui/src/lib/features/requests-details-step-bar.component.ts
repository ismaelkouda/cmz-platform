import { DatePipe } from '@angular/common';
import { Component, input, inject } from '@angular/core';
import { RequestsDetailsWorkflowTimestamp } from '@cmz/requests-domain';
import { TranslationPort } from '@cmz/shared-application';

@Component({
    selector: 'cmz-requests-details-step-bar',
    imports: [DatePipe],
    template: `
        <div
            class="flex flex-wrap gap-x-6 gap-y-2 border-b border-border bg-surface px-4 py-2 text-xs"
            role="list"
        >
            @if (loading()) {
                @for (step of skeletonSteps; track step) {
                    <span
                        class="h-4 w-44 animate-pulse rounded bg-surface-hover"
                    ></span>
                }
            } @else {
                @for (step of steps(); track step.key) {
                    <span
                        class="inline-flex items-center gap-1 text-muted"
                        role="listitem"
                    >
                        <span class="font-medium text-text">
                            {{ t(step.labelKey) }}
                        </span>
                        <span class="font-mono">
                            [{{
                                step.timestamp
                                    ? (step.timestamp
                                      | date: 'yyyy-MM-dd HH:mm:ss')
                                    : '---:---'
                            }}]
                        </span>
                    </span>
                }
            }
        </div>
    `,
})
export class RequestsDetailsStepBarComponent {
    readonly steps = input<RequestsDetailsWorkflowTimestamp[]>([]);
    readonly loading = input(false);

    protected readonly skeletonSteps = [1, 2];

    private readonly i18n = inject(TranslationPort);

    protected t(key: string): string {
        return this.i18n.translate(key);
    }
}
