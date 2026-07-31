import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
    viewChild,
    ElementRef,
} from '@angular/core';
import {
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import {
    TasksActionsProcessingFacade,
    TasksActionsTypeProcessingFacade,
} from '@cmz/processing-application';
import {
    TasksActionsProcessingConformity,
    TasksActionsProcessingEntity,
} from '@cmz/processing-domain';
import { TranslationPort } from '@cmz/shared-application';
import { TelecomOperator } from '@cmz/shared-domain';
import { TELECOM_OPERATOR_OPTIONS } from '@cmz/shared-ui';

export type TasksActionsDialogMode = 'create' | 'edit' | 'view';

@Component({
    selector: 'cmz-tasks-actions-processing-form-dialog',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule],
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
                [formGroup]="form"
                (ngSubmit)="onSubmit()"
            >
                <label class="flex flex-col gap-1 text-sm">
                    <span class="text-muted">{{
                        t(T + '.DIALOG.FORM.TYPE')
                    }}</span>
                    <select
                        formControlName="type"
                        class="rounded border border-border bg-surface px-2 py-2"
                    >
                        <option value="">
                            {{ t('COMMON.SELECT_PLACEHOLDER') }}
                        </option>
                        @for (opt of typeOptions(); track opt.value) {
                            <option [value]="opt.value">{{ opt.label }}</option>
                        }
                    </select>
                </label>

                <label class="flex flex-col gap-1 text-sm">
                    <span class="text-muted">{{ t('COMMON.OPERATORS') }}</span>
                    <select
                        formControlName="operator"
                        class="rounded border border-border bg-surface px-2 py-2"
                    >
                        <option value="">
                            {{ t('COMMON.SELECT_PLACEHOLDER') }}
                        </option>
                        @for (opt of operatorOptions(); track opt.value) {
                            <option [value]="opt.value">{{ opt.label }}</option>
                        }
                    </select>
                </label>

                <label class="flex flex-col gap-1 text-sm">
                    <span class="text-muted">{{
                        t(T + '.DIALOG.FORM.DATE_ACTION')
                    }}</span>
                    <input
                        type="datetime-local"
                        formControlName="date"
                        class="rounded border border-border bg-surface px-2 py-2"
                    />
                </label>

                <label class="flex flex-col gap-1 text-sm">
                    <span class="text-muted">{{
                        t(T + '.DIALOG.FORM.CONFORMITY.TITLE')
                    }}</span>
                    <select
                        formControlName="isConform"
                        class="rounded border border-border bg-surface px-2 py-2"
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
                </label>

                <label class="flex flex-col gap-1 text-sm">
                    <span class="text-muted">{{
                        t(T + '.DIALOG.FORM.DESCRIPTION')
                    }}</span>
                    <textarea
                        formControlName="description"
                        rows="3"
                        maxlength="255"
                        class="rounded border border-border bg-surface px-2 py-2"
                        [placeholder]="
                            t(T + '.DIALOG.FORM.DESCRIPTION_PLACEHOLDER')
                        "
                    ></textarea>
                </label>

                <label class="flex items-center gap-2 text-sm">
                    <input type="checkbox" formControlName="shouldNotifyUser" />
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
                                form.invalid ||
                                actionsFacade.actionState() === 'loading'
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

    protected readonly actionsFacade = inject(TasksActionsProcessingFacade);
    private readonly typesFacade = inject(TasksActionsTypeProcessingFacade);
    private readonly i18n = inject(TranslationPort);

    private readonly dialogRef =
        viewChild<ElementRef<HTMLDialogElement>>('dlg');

    private readonly selectedTypeCode = signal('');

    readonly form = new FormGroup({
        type: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required],
        }),
        operator: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required],
        }),
        date: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required],
        }),
        description: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required],
        }),
        shouldNotifyUser: new FormControl(false, { nonNullable: true }),
        isConform: new FormControl<TasksActionsProcessingConformity | ''>('', {
            nonNullable: true,
            validators: [Validators.required],
        }),
    });

    protected readonly typeOptions = computed(() =>
        this.typesFacade.options().map((item) => ({
            value: item.value,
            label: item.label,
        }))
    );

    protected readonly operatorOptions = computed(() => {
        const selected = this.typesFacade
            .options()
            .find((item) => item.value === this.selectedTypeCode());
        const allowed = selected?.operators ?? [];
        return TELECOM_OPERATOR_OPTIONS.filter((opt) =>
            allowed.length > 0
                ? allowed.includes(opt.value as TelecomOperator)
                : true
        ).map((opt) => ({
            value: opt.value,
            label: this.t(opt.label),
        }));
    });

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
        this.form.controls.type.valueChanges.subscribe((value) => {
            this.selectedTypeCode.set(value);
            this.form.controls.operator.reset('');
        });

        effect(() => {
            const dlg = this.dialogRef()?.nativeElement;
            if (!dlg) {
                return;
            }
            if (this.visible()) {
                dlg.showModal();
                this.typesFacade.loadTypes(this.reportUniqId(), {
                    forceRefresh: true,
                });
                this.patchForm();
            } else if (dlg.open) {
                dlg.close();
            }
        });

        effect(() => {
            const isView = this.mode() === 'view';
            const loading = this.actionsFacade.actionState() === 'loading';
            if (isView || loading) {
                this.form.disable({ emitEvent: false });
            } else {
                this.form.enable({ emitEvent: false });
            }
        });
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected onSubmit(): void {
        if (this.form.invalid || this.mode() === 'view') {
            return;
        }
        const value = this.form.getRawValue();
        const date = new Date(value.date);
        const payload = {
            reportUniqId: this.reportUniqId(),
            date,
            type: value.type,
            operator: value.operator,
            description: value.description,
            shouldNotifyUser: value.shouldNotifyUser,
            isConform: value.isConform as TasksActionsProcessingConformity,
        };

        if (this.mode() === 'edit') {
            const item = this.editingItem();
            if (!item) {
                return;
            }
            this.actionsFacade.update({ uniqId: item.uniqId, ...payload });
        } else {
            this.actionsFacade.create(payload);
        }
        this.saved.emit();
        this.close();
    }

    protected onDialogClose(): void {
        this.closed.emit();
    }

    close(): void {
        this.dialogRef()?.nativeElement.close();
        this.form.reset({
            type: '',
            operator: '',
            date: '',
            description: '',
            shouldNotifyUser: false,
            isConform: '',
        });
        this.closed.emit();
    }

    private patchForm(): void {
        const item = this.editingItem();
        if (!item || this.mode() === 'create') {
            this.form.reset({
                type: '',
                operator: '',
                date: this.toLocalInput(new Date()),
                description: '',
                shouldNotifyUser: false,
                isConform: '',
            });
            return;
        }
        this.selectedTypeCode.set(item.code);
        this.form.reset({
            type: item.code,
            operator: item.operators[0] ?? '',
            date: this.toLocalInput(item.date),
            description: item.description,
            shouldNotifyUser: item.shouldNotifyUser,
            isConform: item.isConform,
        });
    }

    private toLocalInput(date: Date): string {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
}
