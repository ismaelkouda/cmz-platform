import {
    ChangeDetectionStrategy,
    Component,
    Signal,
    computed,
    inject,
} from '@angular/core';
import { NotificationsFacade } from '@cmz/communication-application';
import {
    ConfirmDialogPort,
    PermissionActionsService,
    TranslationPort,
} from '@cmz/shared-application';
import {
    FilterComponent,
    FilterField,
    PaginationComponent,
    TableComponent,
    TYPE_REPORT_LABEL,
    labelsToFilterOptions,
} from '@cmz/shared-ui';
import { NOTIFICATIONS_TABLE } from '../constants/notifications-table.constant';
import { NOTIFICATIONS_FILTER_KEYS } from '../constants/notifications-filter-keys.constant';
import { NotificationsVmProps } from '../adapters/notifications-vm-props.interface';
import { NotificationsPresenter } from '../adapters/notifications-vm.presenter';
import { NotificationsFilterStore } from '../stores/notifications-filter.store';

const ROUTE = '/communication/notifications';
const T = 'COMMUNICATION.NOTIFICATIONS';

/**
 * Liste `notifications` — lecture seule + une action réelle (« marquer
 * comme lu »). Le bouton d'en-tête « tout marquer comme lu » (`readAll`)
 * existait déjà côté source, réellement câblé (contrairement au dialogue de
 * détail par ligne, stub jamais branché — remplacé ici par `markAsRead`
 * par ligne, cf. `NotificationsPresenter`). Pas d'export Excel : aucune
 * autre liste reconstruite dans ce monorepo n'a porté cette fonctionnalité
 * (`ExcelExportService` n'existe pas côté kernel reconstruit) — cohérence
 * plutôt que fidélité isolée à cette seule vue.
 */
@Component({
    selector: 'cmz-notifications-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FilterComponent, TableComponent, PaginationComponent],
    providers: [NotificationsFilterStore],
    template: `
        <section class="flex flex-col gap-4">
            <header class="flex items-center justify-between">
                <h1 class="text-lg font-semibold text-text">
                    {{ t(ns + '.TITLE') }}
                </h1>
                <div class="flex gap-2">
                    <button
                        type="button"
                        class="rounded border border-border px-3 py-2 text-sm hover:bg-surface-hover"
                        (click)="onRefresh()"
                    >
                        {{ t('COMMON.REFRESH') }}
                    </button>
                    <button
                        type="button"
                        class="rounded bg-primary px-3 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
                        [disabled]="!canReadAll()"
                        [title]="readAllTooltip()"
                        (click)="onReadAll()"
                    >
                        {{ t('COMMON.READ_ALL') }}
                    </button>
                </div>
            </header>

            <cmz-filter
                [(model)]="filterModel"
                [fields]="filterFields()"
                [loading]="facade.isLoading()"
                (apply)="onApply()"
                (clear)="onClear()"
            />

            <cmz-table
                [columns]="tableColumns"
                [rows]="itemsVM()"
                [loading]="facade.isLoading()"
                [indexOffset]="indexOffset()"
                dataKey="uniqId"
                (actionClicked)="onAction($event)"
            />

            @if (facade.value(); as page) {
                <cmz-pagination
                    [meta]="page"
                    (pageChange)="onChangePage($event)"
                />
            }
        </section>
    `,
})
export class NotificationsListComponent {
    protected readonly facade = inject(NotificationsFacade);
    private readonly store = inject(NotificationsFilterStore);
    private readonly permissions = inject(PermissionActionsService);
    private readonly confirm = inject(ConfirmDialogPort);
    private readonly i18n = inject(TranslationPort);

    protected readonly ns = T;
    protected readonly filterModel = this.store.model;
    protected readonly tableColumns = NOTIFICATIONS_TABLE.cols;

    private readonly canRead = this.permissions.can(ROUTE, 'edit');
    protected readonly canReadAll = computed(
        () => this.canRead() && this.facade.items().length > 0
    );

    protected readonly readAllTooltip = computed(() =>
        this.canReadAll()
            ? this.t(T + '.TOOLTIP.READ_ALL')
            : this.t(T + '.TOOLTIP.NOT_READ_ALL')
    );

    private readonly presenter = new NotificationsPresenter((k) =>
        this.i18n.translate(k)
    );

    protected readonly itemsVM = computed<NotificationsVmProps[]>(() => {
        const authorization = { canRead: this.canRead() };
        const tooltip = { read: this.t(T + '.TOOLTIP.NO_PERMISSION_READ') };
        return this.facade
            .items()
            .map((item) =>
                this.presenter.map(item, { authorization, tooltip })
            );
    });

    protected readonly indexOffset = computed(() => {
        const page = this.facade.value();
        return page ? (page.currentPage - 1) * page.perPage : 0;
    });

    protected readonly filterFields: Signal<FilterField[]> = computed(() => [
        {
            type: 'text',
            name: NOTIFICATIONS_FILTER_KEYS.SEARCH,
            label: T + '.FILTER.SEARCH',
            placeholder: T + '.FILTER.SEARCH_PLACEHOLDER',
        },
        {
            type: 'select',
            name: NOTIFICATIONS_FILTER_KEYS.TYPE,
            label: T + '.FILTER.TYPE',
            placeholder: 'COMMON.SELECT_PLACEHOLDER',
            options: labelsToFilterOptions(TYPE_REPORT_LABEL, (k) =>
                this.i18n.translate(k)
            ),
        },
        {
            type: 'date',
            name: NOTIFICATIONS_FILTER_KEYS.START_DATE,
            label: T + '.FILTER.DATE.FROM',
        },
        {
            type: 'date',
            name: NOTIFICATIONS_FILTER_KEYS.END_DATE,
            label: T + '.FILTER.DATE.TO',
        },
    ]);

    constructor() {
        this.facade.load(this.store.toContract());
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected onApply(): void {
        this.facade.load(this.store.toContract(), '1', { forceRefresh: true });
    }

    protected onClear(): void {
        this.store.reset();
        this.facade.load(this.store.toContract(), '1', { forceRefresh: true });
    }

    protected onRefresh(): void {
        this.facade.reload();
    }

    protected onChangePage(page: number): void {
        this.facade.changePage(String(page));
    }

    protected async onReadAll(): Promise<void> {
        if (!this.canReadAll()) {
            return;
        }
        const confirmed = await this.confirm.confirm(
            this.i18n.translate(`${T}.SWEET_ALERT.MESSAGE.READ_ALL`),
            { title: this.t(`${T}.SWEET_ALERT.TITLE.READ_ALL`) }
        );
        if (confirmed) {
            this.facade.readAll();
        }
    }

    protected onAction(event: {
        row: NotificationsVmProps;
        actionId: string;
    }): void {
        const { row, actionId } = event;
        if (actionId === 'markAsRead') {
            this.facade.readOne({ uniqId: row.uniqId });
        }
    }
}
