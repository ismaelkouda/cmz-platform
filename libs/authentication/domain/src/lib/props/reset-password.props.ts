/**
 * Réponse réduite à `message` (décision 1 du plan) : le composant source
 * (`reset-password.component.ts`) ne fait que rediriger vers `/login` sur
 * succès (pas d'auto-login) — `user`/`token` n'y sont jamais lus.
 */
export interface ResetPasswordProps {
    readonly message: string;
}
