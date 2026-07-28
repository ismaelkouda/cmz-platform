import { GenericRequiredError } from '@cmz/shared-domain';

/**
 * Règle transverse home/slide : `buttonLabel`/`buttonUrl` doivent être
 * fournis ensemble ou pas du tout (CTA optionnelle mais complète). Extrait en
 * un seul helper partagé au sein du domaine (au lieu de dupliquer la paire de
 * checks dans chaque validateur, comme le faisait le source) — pas un enum,
 * donc pas concerné par la règle « chacun le sien ».
 */
export function assertButtonPairComplete(
    buttonLabel: string | undefined,
    buttonUrl: string | undefined,
    urlRequiredKey: string,
    labelRequiredKey: string
): void {
    if (buttonLabel && !buttonUrl) {
        throw new GenericRequiredError(urlRequiredKey);
    }
    if (buttonUrl && !buttonLabel) {
        throw new GenericRequiredError(labelRequiredKey);
    }
}
