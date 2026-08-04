import { Component, input, output, inject } from '@angular/core';
import { RequestsDetailsEntity } from '@cmz/requests-domain';
import { TranslationPort } from '@cmz/shared-application';

@Component({
    selector: 'cmz-requests-details-sidebar',
    template: `
        <aside
            class="flex w-72 shrink-0 flex-col gap-4 self-stretch overflow-y-auto border-r border-border bg-surface-alt p-4"
        >
            @if (loading()) {
                <p class="text-sm text-muted">{{ t('COMMON.LOADING') }}</p>
            } @else if (details(); as item) {
                @if (item.canTake) {
                    <button
                        type="button"
                        class="w-full rounded bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                        [disabled]="actionLoading()"
                        (click)="takeRequested.emit()"
                    >
                        {{ t(item.submitLabelKey) }}
                    </button>
                }

                @if (showInitiatorSection(item)) {
                    <section class="flex flex-col gap-2">
                        <h3
                            class="text-xs font-semibold uppercase tracking-wide text-muted"
                        >
                            {{ t('MANAGEMENT.STATUS.SUBMISSION') }}
                        </h3>
                        <p class="text-sm">
                            <span class="font-medium">
                                {{ t('MANAGEMENT.SIDEBAR.INITIATOR.PHONE') }}:
                            </span>
                            {{ item.initiatorPhone }}
                            <button
                                type="button"
                                class="ml-1 text-primary hover:underline"
                                [title]="t('COMMON.COPY')"
                                (click)="
                                    copyRequested.emit(item.initiatorPhone)
                                "
                            >
                                ⧉
                            </button>
                        </p>
                        @if (item.initiator?.email) {
                            <p class="text-sm">
                                <span class="font-medium">
                                    {{
                                        t('MANAGEMENT.SIDEBAR.INITIATOR.EMAIL')
                                    }}:
                                </span>
                                {{ item.initiator!.email }}
                            </p>
                        }
                    </section>
                }

                @if (showApproverSection(item)) {
                    <section class="flex flex-col gap-2">
                        <h3
                            class="text-xs font-semibold uppercase tracking-wide text-muted"
                        >
                            {{ t('MANAGEMENT.STATUS.QUALIFICATION') }}
                        </h3>
                        <p class="text-sm">
                            <span class="font-medium">
                                {{
                                    t('MANAGEMENT.SIDEBAR.APPROVER.LAST_NAME')
                                }}:
                            </span>
                            {{ item.approvedBy?.lastName ?? '—' }}
                        </p>
                        <p class="text-sm">
                            <span class="font-medium">
                                {{
                                    t('MANAGEMENT.SIDEBAR.APPROVER.FIRST_NAME')
                                }}:
                            </span>
                            {{ item.approvedBy?.firstName ?? '—' }}
                        </p>
                        @if (item.approvedBy?.phone) {
                            <p class="text-sm">
                                <span class="font-medium">
                                    {{
                                        t('MANAGEMENT.SIDEBAR.APPROVER.PHONE')
                                    }}:
                                </span>
                                {{ item.approvedBy!.phone }}
                                <button
                                    type="button"
                                    class="ml-1 text-primary hover:underline"
                                    [title]="t('COMMON.COPY')"
                                    (click)="
                                        copyRequested.emit(
                                            item.approvedBy!.phone
                                        )
                                    "
                                >
                                    ⧉
                                </button>
                            </p>
                        }
                    </section>
                }

                @if (showRejecterSection(item)) {
                    <section class="flex flex-col gap-2">
                        <h3
                            class="text-xs font-semibold uppercase tracking-wide text-muted"
                        >
                            {{ t('MANAGEMENT.STATUS.QUALIFICATION') }}
                        </h3>
                        <p class="text-sm">
                            <span class="font-medium">
                                {{ t('MANAGEMENT.SIDEBAR.REFUSER.LAST_NAME') }}:
                            </span>
                            {{ item.rejectedBy?.lastName ?? '—' }}
                        </p>
                        <p class="text-sm">
                            <span class="font-medium">
                                {{
                                    t('MANAGEMENT.SIDEBAR.REFUSER.FIRST_NAME')
                                }}:
                            </span>
                            {{ item.rejectedBy?.firstName ?? '—' }}
                        </p>
                        @if (item.rejectedBy?.phone) {
                            <p class="text-sm">
                                <span class="font-medium">
                                    {{ t('MANAGEMENT.SIDEBAR.REFUSER.PHONE') }}:
                                </span>
                                {{ item.rejectedBy!.phone }}
                                <button
                                    type="button"
                                    class="ml-1 text-primary hover:underline"
                                    [title]="t('COMMON.COPY')"
                                    (click)="
                                        copyRequested.emit(
                                            item.rejectedBy!.phone
                                        )
                                    "
                                >
                                    ⧉
                                </button>
                            </p>
                        }
                    </section>
                }
            }
        </aside>
    `,
})
export class RequestsDetailsSidebarComponent {
    readonly details = input<RequestsDetailsEntity | null>(null);
    readonly loading = input(false);
    readonly actionLoading = input(false);

    readonly takeRequested = output<void>();
    readonly copyRequested = output<string>();

    private readonly i18n = inject(TranslationPort);

    protected showInitiatorSection(item: RequestsDetailsEntity): boolean {
        return !!(
            item.treater.createdAt ||
            item.initiator ||
            item.initiatorPhone
        );
    }

    protected showApproverSection(item: RequestsDetailsEntity): boolean {
        return !!(item.treater.approvedAt || item.approvedBy);
    }

    protected showRejecterSection(item: RequestsDetailsEntity): boolean {
        return !!(item.treater.rejectedAt || item.rejectedBy);
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }
}
