import {
    type FormEvent,
    type RefObject,
    useEffect,
    useRef,
    useState,
} from 'react';

import type { ProfileOption } from './page-filters';
import styles from './page.module.scss';

export interface CreateUserValues {
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
    readonly phone: string;
    readonly profileId: string;
}

type CreateField = keyof CreateUserValues;
type MutableCreateForm = Record<CreateField, string>;

const EMPTY_CREATE_FORM: MutableCreateForm = Object.freeze({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    profileId: '',
});

const CREATE_FIELDS: readonly CreateField[] = [
    'lastName',
    'firstName',
    'email',
    'phone',
    'profileId',
];

const FIELD_LABELS: Readonly<Record<CreateField, string>> = {
    lastName: 'Nom',
    firstName: 'Prénom',
    email: 'Adresse e-mail',
    phone: 'Téléphone',
    profileId: 'Profil',
};

interface CreateUserDialogProps {
    readonly open: boolean;
    readonly submitting: boolean;
    readonly profilesLoading: boolean;
    readonly profiles: readonly ProfileOption[];
    readonly returnFocusRef: RefObject<HTMLButtonElement | null>;
    readonly onClose: () => void;
    readonly onSubmit: (values: CreateUserValues) => Promise<string>;
    readonly onCreated: (message: string) => void;
}

function errorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) return error.message;
    return 'Une erreur inattendue est survenue.';
}

function validateCreateForm(values: MutableCreateForm) {
    const errors: Partial<Record<CreateField, string>> = {};
    for (const field of CREATE_FIELDS) {
        if (!values[field].trim()) {
            errors[field] = `${FIELD_LABELS[field]} est obligatoire.`;
        }
    }
    if (
        values.email.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())
    ) {
        errors.email = 'Saisissez une adresse e-mail valide.';
    }
    return errors;
}

export function CreateUserDialog({
    open,
    submitting,
    profilesLoading,
    profiles,
    returnFocusRef,
    onClose,
    onSubmit,
    onCreated,
}: CreateUserDialogProps) {
    const [form, setForm] = useState<MutableCreateForm>(EMPTY_CREATE_FORM);
    const [fieldErrors, setFieldErrors] = useState<
        Partial<Record<CreateField, string>>
    >({});
    const [failureNotice, setFailureNotice] = useState('');
    const dialogRef = useRef<HTMLDialogElement>(null);
    const fieldRefs = useRef<
        Partial<Record<CreateField, HTMLInputElement | HTMLSelectElement>>
    >({});

    useEffect(() => {
        if (!open) return;
        const dialog = dialogRef.current;
        if (!dialog) return;
        const returnFocusElement = returnFocusRef.current;
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.open = true;
        fieldRefs.current.lastName?.focus();
        return () => {
            if (dialog.open && typeof dialog.close === 'function') {
                dialog.close();
            } else {
                dialog.open = false;
            }
            returnFocusElement?.focus();
        };
    }, [open, returnFocusRef]);

    if (!open) return null;

    function close() {
        if (submitting) return;
        setFailureNotice('');
        setFieldErrors({});
        onClose();
    }

    function updateField(field: CreateField, value: string) {
        setForm((current) => ({ ...current, [field]: value }));
        setFieldErrors((current) => {
            if (!current[field]) return current;
            const next = { ...current };
            delete next[field];
            return next;
        });
        if (field === 'email') setFailureNotice('');
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const errors = validateCreateForm(form);
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            const firstInvalid = CREATE_FIELDS.find(
                (field) => errors[field] !== undefined
            );
            if (firstInvalid) fieldRefs.current[firstInvalid]?.focus();
            return;
        }

        try {
            const message = await onSubmit({
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                profileId: form.profileId,
            });
            setFailureNotice('');
            setFieldErrors({});
            setForm(EMPTY_CREATE_FORM);
            onCreated(message);
            onClose();
        } catch (error: unknown) {
            setFailureNotice(errorMessage(error));
        }
    }

    return (
        <dialog
            ref={dialogRef}
            className={styles.createDialog}
            aria-labelledby="create-title"
            aria-describedby="create-description"
            onCancel={(event) => {
                event.preventDefault();
                close();
            }}
        >
            <form
                data-cmz-id="create-user-form"
                className={styles.createForm}
                onSubmit={submit}
                noValidate
            >
                <header>
                    <div>
                        <h2 id="create-title">Créer un utilisateur</h2>
                        <p id="create-description">
                            Tous les champs sont obligatoires.
                        </p>
                    </div>
                    <button
                        type="button"
                        aria-label="Fermer le formulaire de création"
                        disabled={submitting}
                        onClick={close}
                    >
                        ×
                    </button>
                </header>

                <div
                    data-cmz-id="create-failed"
                    className={styles.formError}
                    role={failureNotice ? 'alert' : undefined}
                    hidden={!failureNotice}
                >
                    {failureNotice}
                </div>

                <div className={styles.formGrid}>
                    <label>
                        Nom
                        <input
                            ref={(element) => {
                                fieldRefs.current.lastName =
                                    element ?? undefined;
                            }}
                            data-cmz-id="last-name"
                            type="text"
                            autoComplete="family-name"
                            required
                            disabled={submitting}
                            value={form.lastName}
                            aria-invalid={
                                fieldErrors.lastName ? 'true' : undefined
                            }
                            aria-describedby={
                                fieldErrors.lastName
                                    ? 'lastName-error'
                                    : undefined
                            }
                            onChange={(event) =>
                                updateField('lastName', event.target.value)
                            }
                        />
                        {fieldErrors.lastName && (
                            <span
                                id="lastName-error"
                                className={styles.fieldError}
                            >
                                {fieldErrors.lastName}
                            </span>
                        )}
                    </label>
                    <label>
                        Prénom
                        <input
                            ref={(element) => {
                                fieldRefs.current.firstName =
                                    element ?? undefined;
                            }}
                            data-cmz-id="first-name"
                            type="text"
                            autoComplete="given-name"
                            required
                            disabled={submitting}
                            value={form.firstName}
                            aria-invalid={
                                fieldErrors.firstName ? 'true' : undefined
                            }
                            aria-describedby={
                                fieldErrors.firstName
                                    ? 'firstName-error'
                                    : undefined
                            }
                            onChange={(event) =>
                                updateField('firstName', event.target.value)
                            }
                        />
                        {fieldErrors.firstName && (
                            <span
                                id="firstName-error"
                                className={styles.fieldError}
                            >
                                {fieldErrors.firstName}
                            </span>
                        )}
                    </label>
                    <label className={styles.fullField}>
                        Adresse e-mail
                        <input
                            ref={(element) => {
                                fieldRefs.current.email = element ?? undefined;
                            }}
                            data-cmz-id="email"
                            type="email"
                            autoComplete="email"
                            required
                            disabled={submitting}
                            value={form.email}
                            aria-invalid={
                                fieldErrors.email ? 'true' : undefined
                            }
                            aria-describedby={
                                fieldErrors.email ? 'email-error' : undefined
                            }
                            onChange={(event) =>
                                updateField('email', event.target.value)
                            }
                        />
                        {fieldErrors.email && (
                            <span
                                id="email-error"
                                className={styles.fieldError}
                            >
                                {fieldErrors.email}
                            </span>
                        )}
                    </label>
                    <label>
                        Téléphone
                        <input
                            ref={(element) => {
                                fieldRefs.current.phone = element ?? undefined;
                            }}
                            data-cmz-id="phone"
                            type="tel"
                            autoComplete="tel"
                            required
                            disabled={submitting}
                            value={form.phone}
                            aria-invalid={
                                fieldErrors.phone ? 'true' : undefined
                            }
                            aria-describedby={
                                fieldErrors.phone ? 'phone-error' : undefined
                            }
                            onChange={(event) =>
                                updateField('phone', event.target.value)
                            }
                        />
                        {fieldErrors.phone && (
                            <span
                                id="phone-error"
                                className={styles.fieldError}
                            >
                                {fieldErrors.phone}
                            </span>
                        )}
                    </label>
                    <label className={styles.fullField}>
                        Profil
                        <select
                            ref={(element) => {
                                fieldRefs.current.profileId =
                                    element ?? undefined;
                            }}
                            data-cmz-id="profile-id"
                            required
                            disabled={submitting || profilesLoading}
                            value={form.profileId}
                            aria-invalid={
                                fieldErrors.profileId ? 'true' : undefined
                            }
                            aria-describedby={
                                fieldErrors.profileId
                                    ? 'profileId-error'
                                    : undefined
                            }
                            onChange={(event) =>
                                updateField('profileId', event.target.value)
                            }
                        >
                            <option value="">Sélectionner un profil</option>
                            {profiles.map((profile) => (
                                <option
                                    key={profile.value}
                                    value={profile.value}
                                >
                                    {profile.label}
                                </option>
                            ))}
                        </select>
                        {fieldErrors.profileId && (
                            <span
                                id="profileId-error"
                                className={styles.fieldError}
                            >
                                {fieldErrors.profileId}
                            </span>
                        )}
                    </label>
                </div>

                <footer>
                    <button type="button" disabled={submitting} onClick={close}>
                        Annuler
                    </button>
                    <button
                        type="submit"
                        className={styles.primaryAction}
                        disabled={submitting}
                    >
                        {submitting ? 'Création…' : 'Créer'}
                    </button>
                </footer>
            </form>
        </dialog>
    );
}
