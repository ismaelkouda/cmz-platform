import {
    Component,
    effect,
    inject,
    input,
    output,
    signal,
    viewChild,
    ElementRef,
} from '@angular/core';
import { ReportStatesDetailsFacade } from '@cmz/report-states-application';
import {
    ConfirmDialogPort,
    NotificationPort,
    TranslationPort,
} from '@cmz/shared-application';
import {
    ReportStatesDetailsQualificationContract,
    reportStatesDetailsQualificationVo,
    REPORT_STATES_DETAILS_MODULE_PREFIX,
} from '@cmz/report-states-domain';
import {
    REPORT_STATES_DETAILS_TABS,
    ReportStatesDetailsTabId,
} from '../constants/report-states-details-tab.constant';
import { ReportStatesDetailsHeaderComponent } from './report-states-details-header.component';
import { ReportStatesDetailsInfoPanelComponent } from './report-states-details-info-panel.component';
import { ReportStatesDetailsLocationPanelComponent } from './report-states-details-location-panel.component';
import { ReportStatesDetailsPhotosPanelComponent } from './report-states-details-photos-panel.component';
import { ReportStatesDetailsQualificationFormComponent } from './report-states-details-qualification-form.component';
import { ReportStatesDetailsSidebarComponent } from './report-states-details-sidebar.component';
import { ReportStatesDetailsStepBarComponent } from './report-states-details-step-bar.component';

/**
 * Dialog fiche demande — tranche D (shell fullscreen substitut `ManagementDialog`).
 * Header + sidebar + step bar + onglets + qualification.
 */
@Component({
    selector: 'cmz-report-states-details-dialog',
    imports: [
        ReportStatesDetailsHeaderComponent,
        ReportStatesDetailsSidebarComponent,
        ReportStatesDetailsStepBarComponent,
        ReportStatesDetailsInfoPanelComponent,
        ReportStatesDetailsPhotosPanelComponent,
        ReportStatesDetailsLocationPanelComponent,
        ReportStatesDetailsQualificationFormComponent,
    ],
    template: `
        <dialog
            #dlg
            class="cmz-fullscreen-dialog m-0 max-h-none max-w-none rounded-none border-0 bg-surface p-0 shadow-none open:flex open:h-dvh open:w-dvw open:flex-col"
            (close)="onDialogClose()"
        >
            <header
                class="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-3"
            >
                <cmz-report-states-details-header
                    [details]="facade.value() ?? null"
                    [loading]="facade.isLoading()"
                    (copyRequested)="copyToClipboard($event)"
                />
                <button
                    type="button"
                    class="shrink-0 rounded px-3 py-1.5 text-sm hover:bg-surface-hover"
                    (click)="close()"
                >
                    {{ t('COMMON.CANCEL') }}
                </button>
            </header>

            <div class="flex min-h-0 flex-1 overflow-hidden">
                <cmz-report-states-details-sidebar
                    [details]="facade.value() ?? null"
                    [loading]="facade.isLoading()"
                    [actionLoading]="facade.actionLoading()"
                    (takeRequested)="onTakeFromSidebar()"
                    (copyRequested)="copyToClipboard($event)"
                />

                <main class="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <cmz-report-states-details-step-bar
                        [steps]="workflowSteps()"
                        [loading]="facade.isLoading()"
                    />

                    <nav
                        class="flex shrink-0 gap-1 border-b border-border px-4 py-2"
                        role="tablist"
                    >
                        @for (tab of tabs; track tab.id) {
                            <button
                                type="button"
                                role="tab"
                                class="rounded px-4 py-2 text-sm transition-colors"
                                [class.bg-surface-hover]="
                                    selectedTab() === tab.id
                                "
                                [class.font-medium]="selectedTab() === tab.id"
                                [class.text-primary]="selectedTab() === tab.id"
                                [attr.aria-selected]="selectedTab() === tab.id"
                                (click)="selectTab(tab.id)"
                            >
                                {{ t(tab.label) }}
                            </button>
                        }
                    </nav>

                    <div class="flex-1 overflow-y-auto px-4 py-4">
                        @if (facade.isLoading()) {
                            <p class="text-sm text-muted">
                                {{ t('COMMON.LOADING') }}
                            </p>
                        } @else if (facade.value(); as details) {
                            @switch (selectedTab()) {
                                @case ('information') {
                                    <cmz-report-states-details-info-panel
                                        [details]="details"
                                    />
                                }
                                @case ('photos') {
                                    <cmz-report-states-details-photos-panel
                                        [details]="details"
                                    />
                                }
                                @case ('location') {
                                    <cmz-report-states-details-location-panel
                                        [details]="details"
                                    />
                                }
                            }

                            @if (showQualificationForm()) {
                                <cmz-report-states-details-qualification-form
                                    #qualificationForm
                                    class="mt-4 block"
                                    [details]="details"
                                    [loading]="facade.actionLoading()"
                                    (submitted)="onQualificationSubmit($event)"
                                    (cancelled)="close()"
                                />
                            }
                        } @else if (facade.error()) {
                            <p class="text-sm text-danger">
                                {{ t('COMMON.NO_DATA') }}
                            </p>
                        }
                    </div>
                </main>
            </div>
        </dialog>
    `,
})
export class ReportStatesDetailsDialogComponent {
    protected readonly tabs = REPORT_STATES_DETAILS_TABS;

    readonly visible = input(false);
    readonly uniqId = input<string | null>(null);
    readonly closed = output<void>();
    readonly actionCompleted = output<void>();

    protected readonly facade = inject(ReportStatesDetailsFacade);
    private readonly confirm = inject(ConfirmDialogPort);
    private readonly notification = inject(NotificationPort);
    private readonly i18n = inject(TranslationPort);

    protected readonly selectedTab =
        signal<ReportStatesDetailsTabId>('information');

    private readonly dialogRef =
        viewChild<ElementRef<HTMLDialogElement>>('dlg');
    private readonly qualificationForm =
        viewChild<ReportStatesDetailsQualificationFormComponent>(
            'qualificationForm'
        );

    constructor() {
        effect(() => {
            const dlg = this.dialogRef()?.nativeElement;
            if (!dlg) {
                return;
            }
            if (this.visible()) {
                dlg.showModal();
                this.selectedTab.set('information');
                const id = this.uniqId();
                if (id) {
                    this.facade.loadDetails(id, { forceRefresh: true });
                }
            } else if (dlg.open) {
                dlg.close();
                this.qualificationForm()?.reset();
            }
        });
    }

    protected workflowSteps() {
        return this.facade.value()?.updateWorkflowTimestamps ?? [];
    }

    protected showQualificationForm(): boolean {
        const details = this.facade.value();
        return !!details && (details.canQualify || details.canReject);
    }

    protected selectTab(tabId: ReportStatesDetailsTabId): void {
        this.selectedTab.set(tabId);
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected async copyToClipboard(value: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(value);
            this.notification.info(this.t('COMMON.COPIED'));
        } catch {
            this.notification.error(this.t('COMMON.COPY_FAILED'));
        }
    }

    protected async onTakeFromSidebar(): Promise<void> {
        const details = this.facade.value();
        if (!details) {
            return;
        }
        await this.onTake(details);
    }

    protected async onTake(details: { uniqId: string }): Promise<void> {
        const confirmed = await this.confirm.confirm(
            this.t('REPORT_STATES.DETAILS.CONFIRM.TAKE.MESSAGE').replace(
                '{uniqId}',
                details.uniqId
            ),
            {
                title: this.t('REPORT_STATES.DETAILS.CONFIRM.TAKE.TITLE'),
                confirmText: this.t('COMMON.CONFIRM'),
                cancelText: this.t('COMMON.CANCEL'),
            }
        );
        if (!confirmed) {
            return;
        }
        this.facade.take({ uniqId: details.uniqId });
        this.actionCompleted.emit();
        this.close();
    }

    protected async onQualificationSubmit(
        form: ReportStatesDetailsQualificationContract
    ): Promise<void> {
        const entity = this.facade.value();
        if (!entity) {
            return;
        }

        try {
            reportStatesDetailsQualificationVo(
                form,
                REPORT_STATES_DETAILS_MODULE_PREFIX
            );
        } catch {
            this.notification.error(
                this.t('REPORT_STATES.DETAILS.QUALIFICATION.VALIDATION_ERROR')
            );
            return;
        }

        const isReject = form.decision === 'rejected';
        const confirmKey = isReject ? 'REJECT' : 'APPROVE';
        const confirmed = await this.confirm.confirm(
            this.t(
                `REPORT_STATES.DETAILS.CONFIRM.${confirmKey}.MESSAGE`
            ).replace('{uniqId}', entity.uniqId),
            {
                title: this.t(
                    `REPORT_STATES.DETAILS.CONFIRM.${confirmKey}.TITLE`
                ),
                confirmText: this.t('COMMON.CONFIRM'),
                cancelText: this.t('COMMON.CANCEL'),
            }
        );
        if (!confirmed) {
            return;
        }

        if (isReject) {
            this.facade.reject(entity, form);
        } else {
            this.facade.approve(entity, form);
        }
        this.actionCompleted.emit();
        this.close();
    }

    protected onDialogClose(): void {
        this.qualificationForm()?.reset();
        this.closed.emit();
    }

    close(): void {
        this.dialogRef()?.nativeElement.close();
        this.qualificationForm()?.reset();
        this.closed.emit();
    }
}
