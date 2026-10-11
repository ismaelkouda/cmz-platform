import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
    Component,
    ElementRef,
    Injector,
    afterNextRender,
    computed,
    inject,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';
import {
    FormField,
    disabled,
    emailError,
    form,
    pattern,
    required,
    submit,
    validate,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';

import { PageComposition } from '../../generated/page_6666666666666666/angular/src';
import type { ProfileOption } from '../../generated/page_6666666666666666/angular/src/nodes/profiles-select/models';

const EMPTY_USER = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    profileId: '',
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function messageFrom(error: unknown): string {
    if (error instanceof Error && error.message.trim()) return error.message;
    const message = (error as { message?: unknown } | null)?.message;
    if (typeof message === 'string' && message.trim()) return message;
    return 'Une erreur inattendue est survenue.';
}

// Dialogue de création d'un utilisateur. Il possède le brouillon, sa
// validation, la soumission, le conflit d'adresse, la confirmation d'abandon
// et son propre focus. La page décide de l'ouvrir, rend le reste inerte,
// annonce le succès et reprend le focus : elle écoute `created` et `closed`.
@Component({
    imports: [CdkTrapFocus, FormField],
    selector: 'app-page-create',
    styleUrl: './page.create.component.scss',
    templateUrl: './page.create.component.html',
})
export class PageCreateComponent {
    readonly profiles = input.required<readonly ProfileOption[]>();
    readonly created = output<void>();
    readonly closed = output<void>();

    private readonly composition = inject(PageComposition);
    private readonly injector = inject(Injector);
    private readonly lastNameInput =
        viewChild<ElementRef<HTMLInputElement>>('lastNameInput');
    private createReturnFocus: HTMLElement | null = null;

    protected readonly createModel = signal({ ...EMPTY_USER });
    protected readonly isDiscardConfirmOpen = signal(false);
    protected readonly invalidCreateAttempt = signal(false);
    protected readonly failureNotice = signal('');
    protected readonly emailConflict = signal(false);
    protected readonly isSubmitting = computed(
        () => this.composition.createUser.state() === 'submitting'
    );
    protected readonly createForm = form(this.createModel, (schema) => {
        required(schema.firstName, { message: 'Le prénom est obligatoire.' });
        required(schema.lastName, { message: 'Le nom est obligatoire.' });
        required(schema.email, { message: "L'adresse email est obligatoire." });
        required(schema.phone, { message: 'Le téléphone est obligatoire.' });
        required(schema.profileId, { message: 'Le profil est obligatoire.' });
        pattern(schema.firstName, /\S/, {
            message: 'Le prénom est obligatoire.',
        });
        pattern(schema.lastName, /\S/, {
            message: 'Le nom est obligatoire.',
        });
        pattern(schema.phone, /\S/, {
            message: 'Le téléphone est obligatoire.',
        });
        validate(schema.email, ({ value }) => {
            const email = value().trim();
            return !email || EMAIL_PATTERN.test(email)
                ? undefined
                : emailError({
                      message: 'Saisissez une adresse email valide.',
                  });
        });
        disabled(schema.firstName, { when: () => this.isSubmitting() });
        disabled(schema.lastName, { when: () => this.isSubmitting() });
        disabled(schema.email, { when: () => this.isSubmitting() });
        disabled(schema.phone, { when: () => this.isSubmitting() });
        disabled(schema.profileId, { when: () => this.isSubmitting() });
    });

    constructor() {
        afterNextRender({
            write: () => this.lastNameInput()?.nativeElement.focus(),
        });
    }

    protected requestClose(): void {
        if (this.isSubmitting()) return;
        if (Object.values(this.createModel()).some((value) => value.trim())) {
            this.createReturnFocus =
                document.activeElement instanceof HTMLElement
                    ? document.activeElement
                    : (this.lastNameInput()?.nativeElement ?? null);
            this.isDiscardConfirmOpen.set(true);
            return;
        }
        this.closed.emit();
    }

    protected continueCreating(): void {
        this.isDiscardConfirmOpen.set(false);
        const target = this.createReturnFocus;
        this.focusAfterRender(
            () => target ?? this.lastNameInput()?.nativeElement
        );
    }

    protected abandon(): void {
        this.isDiscardConfirmOpen.set(false);
        this.closed.emit();
    }

    protected onDialogKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Escape' || this.isDiscardConfirmOpen()) return;
        event.preventDefault();
        this.requestClose();
    }

    protected onDiscardKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        this.continueCreating();
    }

    protected async createUser(event: Event): Promise<void> {
        event.preventDefault();
        this.failureNotice.set('');
        this.emailConflict.set(false);
        const invalid = this.createForm().invalid();
        this.invalidCreateAttempt.set(invalid);
        let succeeded = false;

        await submit(this.createForm, async () => {
            const value = this.createModel();
            try {
                await firstValueFrom(
                    this.composition.createUser.submit({
                        firstName: value.firstName.trim(),
                        lastName: value.lastName.trim(),
                        email: value.email.trim(),
                        phone: value.phone.trim(),
                        profileId: value.profileId,
                    })
                );
                succeeded = true;
                return undefined;
            } catch (error: unknown) {
                const detail = messageFrom(error);
                const isEmail = /e-?mail|adresse/i.test(detail);
                this.emailConflict.set(isEmail);
                this.failureNotice.set("L'utilisateur n'a pas été créé.");
                return [
                    {
                        kind: 'server',
                        message: isEmail
                            ? 'Cette adresse email existe déjà.'
                            : 'La création a échoué. Réessayez.',
                        fieldTree: isEmail
                            ? this.createForm.email
                            : this.createForm,
                    },
                ];
            }
        });
        if (succeeded) {
            this.created.emit();
        } else if (invalid) {
            this.focusAfterRender(() => this.lastNameInput()?.nativeElement);
        } else if (this.emailConflict()) {
            this.focusAfterRender(() =>
                this.lastNameInput()?.nativeElement.form?.querySelector(
                    '[data-cmz-id="email"]'
                )
            );
        }
    }

    protected onEmailInput(): void {
        if (!this.emailConflict()) return;
        this.emailConflict.set(false);
        this.failureNotice.set('');
    }

    protected fieldError(
        field: () => {
            touched(): boolean;
            errors(): readonly { message?: string }[];
        }
    ): string {
        if (!field().touched()) return '';
        return field().errors()[0]?.message ?? '';
    }

    private focusAfterRender(
        resolve: () => HTMLElement | null | undefined
    ): void {
        afterNextRender(
            { write: () => resolve()?.focus() },
            { injector: this.injector }
        );
    }
}
