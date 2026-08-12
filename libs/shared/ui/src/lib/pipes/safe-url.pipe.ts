import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TRUSTED_ORIGIN_PORT } from '../tokens/trusted-origin-port.token';

/**
 * Sanitizer d'URL de ressource (iframe `src`) — **vérifie l'origine avant**
 * de contourner le sanitizer Angular, ne bypasse jamais à l'aveugle.
 *
 * Avant correctif (`audit-workspace-2026-08-03.md`, I-14/I-15) : ce pipe
 * appelait `bypassSecurityTrustResourceUrl` sur n'importe quelle chaîne, sans
 * vérification. Seul consommateur : `GrafanaEmbedComponent`, dont
 * `grafanaLink` vient de la réponse backend (module reporting/monitoring),
 * jamais d'une constante de code — donc rien ne garantissait que l'URL
 * embarquée pointait bien vers Grafana plutôt que vers une origine
 * arbitraire (backend compromis, réponse falsifiée en l'absence de TLS
 * pinning).
 *
 * Ce pipe consulte maintenant `TrustedOriginPort` (défense en profondeur,
 * distincte et complémentaire de la CSP `frame-src` —
 * `deploy/csp.template.conf`, qui reste la barrière réseau/navigateur ;
 * celle-ci est la barrière applicative, active même si l'en-tête CSP est
 * absent ou retiré par un proxy). Si l'origine n'est pas explicitement
 * autorisée (`APP_CONFIG.trustedFrameOrigins`), **aucun bypass n'a lieu** :
 * l'appelant reçoit `null` plutôt qu'une URL de confiance — jamais de
 * bénéfice du doute, jamais de repli permissif.
 */
@Pipe({ name: 'safeUrl' })
export class SafeUrlPipe implements PipeTransform {
    private readonly sanitizer = inject(DomSanitizer);
    private readonly trustedOrigin = inject(TRUSTED_ORIGIN_PORT);

    transform(url: string): SafeResourceUrl | null {
        if (!this.trustedOrigin.isTrustedFrameOrigin(url)) {
            console.warn(
                `[SafeUrlPipe] Origine non autorisée pour une iframe, bloquée : ${url}. ` +
                    'Configurer APP_CONFIG.trustedFrameOrigins (window.__env.trustedFrameOrigins) ' +
                    'si cette origine est légitime.'
            );
            return null;
        }

        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
}
