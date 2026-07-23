import { FormControl } from '@angular/forms';

/**
 * Résout le message d'erreur à afficher pour un `FormControl`, à partir d'une
 * table de messages par clé d'erreur Angular (required, email, minlength, …).
 * Fonction pure (aucune dépendance métier) ; chaque module la ré-exporte
 * localement pour autoriser une composition/override future.
 */
export function getControlError(
    control: FormControl,
    messages: Record<string, string>
): string | null {
    if (!control.touched || !control.errors) {
        return null;
    }
    const errorKey = Object.keys(control.errors)[0];
    return messages[errorKey] ?? null;
}
