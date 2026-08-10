import {
    Component,
    computed,
    effect,
    inject,
    input,
    output,
    viewChild,
    ElementRef,
} from '@angular/core';
import { FormField } from '@angular/forms/signals';
import {
    TasksActionsProcessingConformity,
    TasksActionsProcessingEntity,
} from '@cmz/processing-domain';
import { TranslationPort } from '@cmz/shared-application';
import { FieldComponent } from '@cmz/shared-ui';
import { TasksActionsProcessingFormStore } from '../stores/tasks-actions-processing-form.store';

export type TasksActionsDialogMode = 'create' | 'edit' | 'view';

/**
 * Dialog `tasks-actions-processing` — Signal Forms (P2-1, migré depuis
 * `ReactiveFormsModule`/`FormGroup`). Cascade `type` → `operator` déléguée
 * au store (même pattern que `messaging-form.store.ts`), formulaire
 * désactivé en mode `view` ou pendant une action via `disabled()` déclaratif
 * plutôt que `form.disable()` impératif.
 */
@Component({
    selector: 'cmz-tasks-actions-processing-form-dialog',
    imports: [FormField, FieldComponent],
    providers: [TasksActionsProcessingFormStore],
    template: `
        <dialog
            #dlg
            class="w-full max-w-lg rounded-lg border border-border bg-surface p-0 shadow-lg backdrop:bg-black/40"
            (close)="onDialogClose()"
        >
            <header
                class="flex items-center justify-between border-b border-border px-4 py-3"
            >
                <h2 class="text-base font-semibold text-text">
                    {{ dialogTitle() }}
                </h2>
                <button
                    type="button"
                    class="rounded px-2 py-1 text-sm hover:bg-surface-hover"
                    (click)="close()"
                >
                    {{ t('COMMON.CANCEL') }}
                </button>
            </header>

            <form
                class="flex flex-col gap-3 px-4 py-4"
                (submit)="onSubmit($event)"
            >
                <cmz-field
                    [label]="T + '.DIALOG.FORM.TYPE'"
                    [field]="store.form.type"
                    for="type"
                    [required]="true"
                >
                    <select
                        id="type"
                        [formField]="store.form.type"
                        (change)="onTypeChange($event)"
                        class="rounded border border-border bg-surface px-2 py-2 disabled:opacity-50"
                    >
                        <option value="">
                            {{ t('COMMON.SELECT_PLACEHOLDER') }}
                        </option>
                        @for (opt of store.typeOptions(); track opt.value) {
                            <option [value]="opt.value">{{ opt.label }}</option>
                        }
                    </select>
                </cmz-field>

                <cmz-field
                    [label]="'COMMON.OPERATORS'"
                    [field]="store.form.operator"
                    for="operator"
                    [required]="true"
                >
                    <select
                        id="operator"
                        [formField]="store.form.operator"
                        class="rounded border border-border bg-surface px-2 py-2 disabled:opacity-50"
                    >
                        <option value="">
                            {{ t('COMMON.SELECT_PLACEHOLDER') }}
                        </option>
                        @for (
                            opt of store.operatorOptions();
                            track opt.value
                        ) {
                            <option [value]="opt.value">
                                {{ t(opt.label) }}
                            </option>
                        }
                    </select>
                </cmz-field>

                <cmz-field
                    [label]="T + '.DIALOG.FORM.DATE_ACTION'"
                    [field]="store.form.date"
                    for="date"
                    [required]="true"
                >
                    <input
                        id="date"
                        type="datetime-local"
                        [formField]="store.form.date"
                        class="rounded border border-border bg-surface px-2 py-2 disabled:opacity-50"
                    />
                </cmz-field>

                <cmz-field
                    [label]="T + '.DIALOG.FORM.CONFORMITY.TITLE'"
                    [field]="store.form.isConform"
                    for="isConform"
                    [required]="true"
                >
                    <select
                        id="isConform"
                        [formField]="store.form.isConform"
                        class="rounded border border-border bg-surface px-2 py-2 disabled:opacity-50"
                    >
                        <option value="">
                            {{ t('COMMON.SELECT_PLACEHOLDER') }}
                        </option>
                        <option [value]="conformity.CONFORM">
                            {{ t(T + '.DIALOG.FORM.CONFORMITY.CONFORM') }}
                        </option>
                        <option [value]="conformity.NON_CONFORM">
                            {{ t(T + '.DIALOG.FORM.CONFORMITY.NO_CONFORM') }}
                        </option>
                    </select>
                </cmz-field>

                <cmz-field
                    [label]="T + '.DIALOG.FORM.DESCRIPTION'"
                    [field]="store.form.description"
                    for="description"
                    [required]="true"
                >
                    <textarea
                        id="description"
                        [formField]="store.form.description"
                        rows="3"
                        class="rounded border border-border bg-surface px-2 py-2 disabled:opacity-50"
                        [placeholder]="
                            t(T + '.DIALOG.FORM.DESCRIPTION_PLACEHOLDER')
                        "
                    ></textarea>
                </cmz-field>

                <label class="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        [formField]="store.form.shouldNotifyUser"
                    />
                    <span>{{ t(T + '.DIALOG.FORM.NOTIFY_USERS') }}</span>
                </label>

                @if (mode() !== 'view') {
                    <footer
                        class="flex justify-end gap-2 border-t border-border pt-3"
                    >
                        <button
                            type="submit"
                            class="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
                            [disabled]="
                                !store.isValid() ||
                                store.actionsFacade.actionState() === 'loading'
                            "
                        >
                            {{ t('COMMON.SAVE') }}
                        </button>
                    </footer>
                }
            </form>
        </dialog>
    `,
})
export class TasksActionsProcessingFormDialogComponent {
    protected readonly T = 'PROCESSING.TASKS.ACTIONS';
    protected readonly conformity = TasksActionsProcessingConformity;

    readonly visible = input(false);
    readonly mode = input<TasksActionsDialogMode>('create');
    readonly reportUniqId = input.required<string>();
    readonly editingItem = input<TasksActionsProcessingEntity | null>(null);
    readonly closed = output<void>();
    readonly saved = output<void>();

    protected readonly store = inject(TasksActionsProcessingFormStore);
    private readonly i18n = inject(TranslationPort);

    private readonly dialogRef =
        viewChild<ElementRef<HTMLDialogElement>>('dlg');

    protected readonly dialogTitle = computed(() => {
        const key =
            this.mode() === 'create'
                ? `${this.T}.DIALOG.TITLE.CREATE`
                : this.mode() === 'edit'
                  ? `${this.T}.DIALOG.TITLE.EDIT`
                  : `${this.T}.DIALOG.TITLE.VIEW`;
        return this.t(key);
    });

    constructor() {
        effect(() => {
            const dlg = this.dialogRef()?.nativeElement;
            if (!dlg) {
                return;
            }
            if (this.visible()) {
                dlg.showModal();
                this.store.loadTypes(this.reportUniqId());
                this.store.open(this.mode(), this.editingItem());
            } else if (dlg.open) {
                dlg.close();
            }
        });
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected onTypeChange(event: Event): void {
        const type = (event.target as HTMLSelectElement).value;
        this.store.onTypeChange(type);
    }

    protected onSubmit(event: Event): void {
        event.preventDefault();
        if (!this.store.isValid() || this.mode() === 'view') {
            return;
        }
        const value = this.store.model();
        const date = new Date(value.date);
        const payload = {
            reportUniqId: this.reportUniqId(),
            date,
            type: value.type,
            operator: value.operator,
            description: value.description,
            shouldNotifyUser: value.shouldNotifyUser,
            isConform: value.isConform as TasksActionsProcessingEntity['isConform'],
        };

        if (this.mode() === 'edit') {
            const item = this.editingItem();
            if (!item) {
                return;
            }
            this.store.actionsFacade.update({ uniqId: item.uniqId, ...payload });
        } else {
            this.store.actionsFacade.create(payload);
        }
        this.saved.emit();
        this.close();
    }

    protected onDialogClose(): void {
        this.closed.emit();
    }

    close(): void {
        this.dialogRef()?.nativeElement.close();
        this.store.reset();
        this.closed.emit();
    }
}
