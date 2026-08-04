import {
    Component,
    effect,
    inject,
    input,
    output,
    viewChild,
    ElementRef,
} from '@angular/core';
import { ProcessingDetailsFacade } from '@cmz/processing-application';
import { ConfirmDialogPort, TranslationPort } from '@cmz/shared-application';
import {
    REPORT_SOURCE_LABEL,
    REPORT_TYPE_LABEL,
    TELECOM_OPERATOR_LABEL,
} from '@cmz/shared-ui';
import { ProcessingDetailsEntity } from '@cmz/processing-domain';

/**
 * Dialog fiche signalement — tranche B (substitut minimal de `ManagementDialog`).
 * Ouvert depuis les listes queues / tasks / all.
 */
@Component({
    selector: 'cmz-processing-details-dialog',
    template: `
        <dialog
            #dlg
            class="w-full max-w-lg rounded-lg border border-border bg-surface p-0 shadow-lg backdrop:bg-black/40"
            (close)="onDialogClose()"
        >
            @if (uniqId(); as id) {
                <header
                    class="flex items-center justify-between border-b border-border px-4 py-3"
                >
                    <h2 class="text-base font-semibold text-text">
                        {{ titleLabel() }}
                    </h2>
                    <button
                        type="button"
                        class="rounded px-2 py-1 text-sm hover:bg-surface-hover"
                        (click)="close()"
                    >
                        {{ t('COMMON.CANCEL') }}
                    </button>
                </header>

                <div class="flex flex-col gap-3 px-4 py-4">
                    @if (facade.isLoading()) {
                        <p class="text-sm text-muted">
                            {{ t('COMMON.LOADING') }}
                        </p>
                    } @else if (facade.value(); as details) {
                        <dl
                            class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm"
                        >
                            <dt class="text-muted">{{ t(T + '.UNIQ_ID') }}</dt>
                            <dd>{{ details.uniqId }}</dd>
                            <dt class="text-muted">
                                {{ t(T + '.REPORT_TYPE') }}
                            </dt>
                            <dd>{{ reportTypeLabel(details) }}</dd>
                            <dt class="text-muted">
                                {{ t(T + '.OPERATORS') }}
                            </dt>
                            <dd>{{ operatorsLabel(details) }}</dd>
                            <dt class="text-muted">{{ t(T + '.SOURCE') }}</dt>
                            <dd>{{ sourceLabel(details) }}</dd>
                            <dt class="text-muted">
                                {{ t(T + '.INITIATOR') }}
                            </dt>
                            <dd>{{ details.initiatorPhone }}</dd>
                            <dt class="text-muted">
                                {{ t(T + '.REPORTED_AT') }}
                            </dt>
                            <dd>{{ details.reportedAt }}</dd>
                            @if (details.description) {
                                <dt class="text-muted">
                                    {{ t(T + '.DESCRIPTION') }}
                                </dt>
                                <dd class="col-span-1">
                                    {{ details.description }}
                                </dd>
                            }
                        </dl>

                        @if (details.canTake || details.canTreat) {
                            <footer
                                class="flex justify-end gap-2 border-t border-border pt-3"
                            >
                                <button
                                    type="button"
                                    class="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
                                    [disabled]="facade.actionLoading()"
                                    (click)="onSubmit(details)"
                                >
                                    {{ t(details.submitLabelKey) }}
                                </button>
                            </footer>
                        }
                    }
                </div>
            }
        </dialog>
    `,
})
export class ProcessingDetailsDialogComponent {
    protected readonly T = 'PROCESSING.DETAILS';

    readonly visible = input(false);
    readonly uniqId = input<string | null>(null);
    readonly closed = output<void>();
    readonly actionCompleted = output<void>();

    protected readonly facade = inject(ProcessingDetailsFacade);
    private readonly i18n = inject(TranslationPort);
    private readonly confirm = inject(ConfirmDialogPort);

    private readonly dialogRef =
        viewChild<ElementRef<HTMLDialogElement>>('dlg');

    constructor() {
        effect(() => {
            const dlg = this.dialogRef()?.nativeElement;
            if (!dlg) {
                return;
            }
            if (this.visible()) {
                dlg.showModal();
                const id = this.uniqId();
                if (id) {
                    this.facade.loadDetails(id, { forceRefresh: true });
                }
            } else if (dlg.open) {
                dlg.close();
            }
        });
    }

    protected titleLabel(): string {
        const details = this.facade.value();
        return details
            ? this.t(details.titleKey)
            : this.t('MANAGEMENT.STATUS.INFORMATION');
    }

    protected reportTypeLabel(details: ProcessingDetailsEntity): string {
        return this.t(REPORT_TYPE_LABEL[details.reportType]);
    }

    protected operatorsLabel(details: ProcessingDetailsEntity): string {
        return details.operators
            .map((op) => this.t(TELECOM_OPERATOR_LABEL[op]))
            .join(', ');
    }

    protected sourceLabel(details: ProcessingDetailsEntity): string {
        return this.t(REPORT_SOURCE_LABEL[details.source]);
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected async onSubmit(details: ProcessingDetailsEntity): Promise<void> {
        const id = details.uniqId;
        if (details.canTake) {
            const confirmed = await this.confirm.confirm(
                this.t('PROCESSING.DETAILS.CONFIRM.TAKE.MESSAGE').replace(
                    '{uniqId}',
                    id
                ),
                {
                    title: this.t('PROCESSING.DETAILS.CONFIRM.TAKE.TITLE'),
                    confirmText: this.t('COMMON.CONFIRM'),
                    cancelText: this.t('COMMON.CANCEL'),
                }
            );
            if (!confirmed) return;
            this.facade.take({ uniqId: id });
            this.actionCompleted.emit();
            this.close();
            return;
        }
        if (details.canTreat) {
            const confirmed = await this.confirm.confirm(
                this.t('PROCESSING.DETAILS.CONFIRM.TREAT.MESSAGE'),
                {
                    title: this.t('PROCESSING.DETAILS.CONFIRM.TREAT.TITLE'),
                    confirmText: this.t('COMMON.CONFIRM'),
                    cancelText: this.t('COMMON.CANCEL'),
                }
            );
            if (!confirmed) return;
            this.facade.treat({ uniqId: id });
            this.actionCompleted.emit();
            this.close();
        }
    }

    protected onDialogClose(): void {
        this.closed.emit();
    }

    close(): void {
        this.dialogRef()?.nativeElement.close();
        this.closed.emit();
    }
}
