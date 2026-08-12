import { Service, inject } from '@angular/core';
import { TrustedOriginPort } from '@cmz/shared-domain';
import { APP_CONFIG } from './config.token';

/**
 * Implémentation de `TrustedOriginPort` — lit `APP_CONFIG.trustedFrameOrigins`
 * (`window.__env`, ADR-0007). Vit dans `@cmz/core` plutôt que dans
 * `@cmz/shared-browser` : `type:core` a le droit de dépendre de `type:domain`
 * (où vit le port) ET de lire `APP_CONFIG` (défini ici même) ; `type:browser`
 * n'a le droit de dépendre ni de `type:core` ni d'`APP_CONFIG`
 * (`eslint.config.mjs`, contrainte `type:browser`). Câblé en composition
 * root (`apps/backoffice-angular/src/app/app.config.ts`), comme
 * `StoragePort`/`NavigationPort`.
 *
 * Échoue fermé par construction : `trustedFrameOrigins` absent ou vide →
 * aucune URL n'est jamais considérée fiable. Jamais de `*`/wildcard —
 * l'origine doit correspondre exactement (schéma + hôte + port).
 */
@Service()
export class TrustedOriginAdapter implements TrustedOriginPort {
    private readonly config = inject(APP_CONFIG);

    isTrustedFrameOrigin(url: string): boolean {
        const allowed = this.config.trustedFrameOrigins ?? [];
        if (allowed.length === 0) {
            return false;
        }

        let origin: string;
        try {
            origin = new URL(url, window.location.origin).origin;
        } catch {
            return false; // URL malformée — jamais de bénéfice du doute
        }

        return allowed.includes(origin);
    }
}
