/**
 * Port de confiance d'origine — vérifie qu'une URL provenant d'une source
 * non contrôlée par le code (typiquement une réponse backend) a le droit
 * d'être embarquée dans une iframe avant qu'un composant UI ne demande au
 * sanitizer Angular de lui faire confiance sans discuter
 * (`DomSanitizer.bypassSecurityTrustResourceUrl`).
 *
 * Origine du besoin : `GrafanaEmbedComponent` (`@cmz/shared-ui`) reçoit
 * `grafanaLink` depuis la réponse backend (module reporting/monitoring),
 * jamais une constante de code, et le passe tel quel à `SafeUrlPipe`, qui
 * contournait le sanitizer sans aucune vérification (constat
 * `audit-workspace-2026-08-03.md`, I-14/I-15). Ce port est la correction :
 * une défense en profondeur, **distincte** de la CSP `frame-src`
 * (`deploy/csp.template.conf`, variable `CMZ_CSP_FRAME_SRC`) — celle-ci
 * protège au niveau réseau/navigateur ; celle-là protège même si l'en-tête
 * CSP est absent, mal configuré, ou retiré par un proxy intermédiaire, et
 * documente explicitement, dans le code, quelle(s) origine(s) ont le droit
 * d'être embarquées sans passer par le sanitizer par défaut.
 *
 * Adaptateur : `@cmz/core` (`TrustedOriginAdapter`, lit `APP_CONFIG.
 * trustedFrameOrigins` — même canal de configuration runtime que le reste,
 * ADR-0007). Câblé en composition root (`apps/backoffice-angular/src/app/
 * app.config.ts`), comme `StoragePort`/`NavigationPort`.
 *
 * Interface pure depuis ADR-0024 (Chantier Q, découplage DI Angular hors du
 * kernel agnostique). Jeton `TRUSTED_ORIGIN_PORT` colocalisé dans
 * `@cmz/shared-ui` (`SafeUrlPipe`, seul consommateur `inject()`) — pas dans
 * `@cmz/core`, qui n'est pas consommable depuis `type:ui`.
 */
export interface TrustedOriginPort {
    /**
     * @param url URL à vérifier (typiquement absolue, ex. `https://grafana.
     *   example.org/d/xyz?embed`). Une URL malformée ou relative renvoie
     *   toujours `false` — jamais de bénéfice du doute.
     */
    isTrustedFrameOrigin(url: string): boolean;
}
