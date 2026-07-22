import {
    Injectable,
    inject,
    signal,
    computed,
    effect,
    untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    Validators,
} from '@angular/forms';
import { ResourcesFindOneFacade } from '@pages/seos-reference/application/services/resources/resources-find-one.facade';
import { ResourcesFormControl } from '@pages/seos-reference/presentation/store/resources/resources-form.control';
import { FormValidators } from '@pages/seos-reference/presentation/constants/form-validators.constants';
import { RESOURCES_FORM_KEYS } from '@pages/seos-reference/presentation/constants/resources/resources-form-keys.constant';
import { startWith } from 'rxjs';

type ResourcesFormMode = 'create' | 'edit' | 'details';

@Injectable()
export class ResourcesFormStore {
    private readonly fb = inject(FormBuilder);
    private readonly findOneFacade = inject(ResourcesFindOneFacade);
    readonly VALIDATION = FormValidators;

    readonly form = this.createForm();
    readonly mode = signal<ResourcesFormMode>('create');
    readonly isCreateMode = computed(() => this.mode() === 'create');
    readonly isEditMode = computed(() => this.mode() === 'edit');
    readonly isDetailsMode = computed(() => this.mode() === 'details');

    readonly loading = computed(() => this.findOneFacade.loading());

    readonly status = toSignal(
        this.form.statusChanges.pipe(startWith(this.form.status)),
        {
            initialValue: this.form.status,
        }
    );
    readonly isValid = computed(() => this.status() === 'VALID');

    private readonly item = this.findOneFacade.items;

    constructor() {
        this.initializeDetailsModeEffect();
    }

    private createForm(): FormGroup<ResourcesFormControl> {
        return this.fb.nonNullable.group<ResourcesFormControl>({
            [RESOURCES_FORM_KEYS.CODE]: new FormControl<string | undefined>(
                undefined,
                {
                    nonNullable: true,
                    validators: [Validators.required],
                }
            ),
            [RESOURCES_FORM_KEYS.NAME]: new FormControl<string | undefined>(
                undefined,
                {
                    nonNullable: true,
                    validators: [Validators.required],
                }
            ),
            [RESOURCES_FORM_KEYS.DESCRIPTION]: new FormControl<
                string | undefined
            >(undefined, {
                nonNullable: true,
                validators: [Validators.required],
            }),
        });
    }

    private initializeDetailsModeEffect(): void {
        effect(() => {
            const item = this.item();
            if (this.isCreateMode() || !item) {
                return;
            }
            const { code, name, description } = item;
            const details = this.isDetailsMode();
            untracked(() => {
                queueMicrotask(() => {
                    this.form.patchValue({ code, name, description });
                    if (details) {
                        this.form.disable({ emitEvent: false });
                    }
                });
            });
        });
    }

    private load(uniqId: string): void {
        this.findOneFacade.read({ uniqId }, { forceRefresh: true });
    }

    setMode(uniqId: string | null, mode: ResourcesFormMode): void {
        this.mode.set(mode);
        const handlers: Record<ResourcesFormMode, () => void> = {
            create: () => {
                this.reset();
                this.findOneFacade.reset();
            },
            edit: () => uniqId && this.load(uniqId),
            details: () => uniqId && this.load(uniqId),
        };
        handlers[mode]();
    }

    reset(): void {
        this.form.enable({ emitEvent: false });
        this.form.reset(
            {
                [RESOURCES_FORM_KEYS.CODE]: undefined,
                [RESOURCES_FORM_KEYS.NAME]: undefined,
                [RESOURCES_FORM_KEYS.DESCRIPTION]: undefined,
            },
            { emitEvent: true }
        );
        this.mode.set('create');
        this.form.markAsPristine();
        this.form.markAsUntouched();
    }
}
