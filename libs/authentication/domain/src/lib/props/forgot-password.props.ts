/**
 * Réponse réduite à `message` (décision 1 du plan) : le composant source
 * (`forgot-password.component.ts`) ne lit jamais `user`/`token` — seule la
 * présence d'une réponse déclenche l'écran « email envoyé ». Reproduire
 * `user`/`token` ici serait recopier une incohérence du source, pas la
 * corriger.
 */
export interface ForgotPasswordProps {
    readonly message: string;
}
