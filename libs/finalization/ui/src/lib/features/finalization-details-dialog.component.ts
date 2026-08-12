import {
    Component,
    effect,
    inject,
    input,
    output,
    viewChild,
    ElementRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FinalizationDetailsFacade } from '@cmz/finalization-application';
import { TRANSLATION_PORT } from '@cmz/shared-application';
import {
    REPORT_SOURCE_LABEL,
    REPORT_TYPE_LABEL,
    TELECOM_OPERATOR_LABEL,
    CONFIRM_DIALOG_PORT,
} from '@cmz/shared-ui';
import { FinalizationDetailsEntity } from '@cmz/finalization-domain';

@Component({
    selector: 'cmz-finalization-details-dialog',
    imports: [FormsModule],
    template: `
        <dialog
            #dlg
            class="cmz-fullscreen-dialog w-full max-w-lg rounded-lg border border-border bg-surface p-0 shadow-lg backdrop:bg-black/40"
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
                                <dd>{{ details.description }}</dd>
                            }
                        </dl>

                        @if (details.canFinalize) {
                            <label class="flex flex-col gap-1 text-sm">
                                <span class="text-muted">{{
                                    t(T + '.COMMENT')
                                }}</span>
                                <textarea
                                    class="rounded border border-border bg-surface px-3 py-2"
                                    rows="3"
                                    [(ngModel)]="comment"
                                ></textarea>
                            </label>
                        }

                        @if (details.canTake || details.canFinalize) {
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
export class FinalizationDetailsDialogComponent {
    protected readonly T = 'FINALIZATION.DETAILS';

    readonly visible = input(false);
    readonly uniqId = input<string | null>(null);
    readonly closed = output<void>();
    readonly actionCompleted = output<void>();

    protected readonly facade = inject(FinalizationDetailsFacade);
    private readonly i18n = inject(TRANSLATION_PORT);
    private readonly confirm = inject(CONFIRM_DIALOG_PORT);

    protected comment = '';

    private readonly dialogRef =
        viewChild<ElementRef<HTMLDialogElement>>('dlg');

    constructor() {
        effect(() => {
            const dlg = this.dialogRef()?.nativeElement;
            if (!dlg) return;
            if (this.visible() && this.uniqId()) {
                const id = this.uniqId();
                if (!id) return;
                this.comment = '';
                this.facade.loadDetails(id);
                if (!dlg.open) dlg.showModal();
            } else if (dlg.open) {
                dlg.close();
            }
        });
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected titleLabel(): string {
        const details = this.facade.value();
        return details ? this.t(details.titleKey) : '';
    }

    protected reportTypeLabel(details: FinalizationDetailsEntity): string {
        return this.t(REPORT_TYPE_LABEL[details.reportType]);
    }

    protected operatorsLabel(details: FinalizationDetailsEntity): string {
        return details.operators
            .map((op) => this.t(TELECOM_OPERATOR_LABEL[op]))
            .join(', ');
    }

    protected sourceLabel(details: FinalizationDetailsEntity): string {
        return this.t(REPORT_SOURCE_LABEL[details.source]);
    }

    protected async onSubmit(
        details: FinalizationDetailsEntity
    ): Promise<void> {
        const id = details.uniqId;
        if (details.canTake) {
            const confirmed = await this.confirm.confirm(
                this.t('FINALIZATION.DETAILS.CONFIRM.TAKE.MESSAGE').replace(
                    '{uniqId}',
                    id
                ),
                {
                    title: this.t('FINALIZATION.DETAILS.CONFIRM.TAKE.TITLE'),
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
        if (details.canFinalize) {
            const confirmed = await this.confirm.confirm(
                this.t('FINALIZATION.DETAILS.CONFIRM.FINALIZE.MESSAGE'),
                {
                    title: this.t(
                        'FINALIZATION.DETAILS.CONFIRM.FINALIZE.TITLE'
                    ),
                    confirmText: this.t('COMMON.CONFIRM'),
                    cancelText: this.t('COMMON.CANCEL'),
                }
            );
            if (!confirmed) return;
            this.facade.finalize({ uniqId: id, comment: this.comment.trim() });
            this.actionCompleted.emit();
            this.close();
        }
    }

    protected close(): void {
        this.dialogRef()?.nativeElement?.close();
    }

    protected onDialogClose(): void {
        this.closed.emit();
    }
}
