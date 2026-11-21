// X4-sécurité : politique de sécurité de contenu de la coque Angular
// extérieure. Elle ne dépend pas de la page : une réalisation, même hostile,
// ne peut ni joindre une autre origine, ni exécuter un script en ligne, ni
// encadrer ou être encadrée. La coque la porte dans `src/index.html` (balise
// meta) et dans un gabarit d'en-tête pour le serveur ; les deux sont générés
// ici, possédés et scellés (ADR-0103).
//
// Topologie A (décision du propriétaire) : l'application et ses services sont
// joints depuis une seule origine, le serveur relaie `/api/<service>/`.
// `connect-src 'self'` est donc définitif.
export const EXTERNAL_CSP_DIRECTIVES = Object.freeze([
    ['default-src', "'self'"],
    ['script-src', "'self'"],
    // Angular insère les styles de composant en éléments <style> ; un nonce
    // n'a pas de sens en service statique. Un style ne sort pas du navigateur
    // et ses url() restent soumises à img-src et font-src.
    ['style-src', "'self' 'unsafe-inline'"],
    ['img-src', "'self' data:"],
    ['font-src', "'self'"],
    ['connect-src', "'self'"],
    ['worker-src', "'self'"],
    ['manifest-src', "'self'"],
    ['frame-src', "'none'"],
    ['object-src', "'none'"],
    ['form-action', "'self'"],
    // 'none' refuserait <base href="/"> et casserait le routeur.
    ['base-uri', "'self'"],
    // Trusted Types : ferme innerHTML, insertAdjacentHTML et les scripts par
    // chaîne ; Angular les prend en charge avec ces deux politiques. `cmz-sw`
    // est la politique de main.ts pour l'URL exacte du service worker, puits
    // TrustedScriptURL. Pas de 'allow-duplicates' : une seconde création est
    // refusée par le navigateur.
    ['require-trusted-types-for', "'script'"],
    ['trusted-types', 'angular angular#bundler cmz-sw'],
]);

// Ignorées dans une balise meta : en-tête seulement.
export const EXTERNAL_CSP_HEADER_ONLY = Object.freeze([
    ['frame-ancestors', "'none'"],
]);

const serialize = (directives) =>
    directives.map(([name, value]) => `${name} ${value}`).join('; ');

export const EXTERNAL_CSP_META = serialize(EXTERNAL_CSP_DIRECTIVES);
export const EXTERNAL_CSP_HEADER = serialize([
    ...EXTERNAL_CSP_DIRECTIVES,
    ...EXTERNAL_CSP_HEADER_ONLY,
]);
export const EXTERNAL_CSP_HEADER_PATH = 'deploy/content-security-policy.conf';

export function cspMetaElement() {
    return `<meta http-equiv="Content-Security-Policy" content="${EXTERNAL_CSP_META}" />`;
}

// La balise doit précéder toute ressource : elle ne gouverne que ce qui est
// chargé après elle. Elle suit immédiatement la déclaration de jeu de
// caractères, qui ne charge rien.
export function withCspMeta(indexHtml) {
    const charset = '<meta charset="utf-8" />';
    if (indexHtml.split(charset).length !== 2)
        throw new Error('application shell: index.html charset is not unique');
    if (indexHtml.includes('Content-Security-Policy'))
        throw new Error('application shell: index.html already has a policy');
    const indentation = /\n([ \t]*)<meta charset="utf-8" \/>/.exec(
        indexHtml
    )?.[1];
    if (indentation === undefined)
        throw new Error('application shell: index.html charset is not a line');
    return indexHtml.replace(
        charset,
        `${charset}\n${indentation}${cspMetaElement()}`
    );
}

export function renderCspHeaderTemplate() {
    return `# Généré par la coque extérieure, possédé et scellé (ADR-0103).
# Même politique que la balise meta de src/index.html, plus frame-ancestors,
# ignorée dans une balise meta. Directive nginx à placer dans le bloc server
# qui sert l'application ; ne pas l'affaiblir : la coque ne se republie pas,
# une politique modifiée à la main est un écart du registre.
add_header Content-Security-Policy "${EXTERNAL_CSP_HEADER}" always;
# Une fenêtre ouverte par une autre origine ne garde aucune référence à
# l'application (X4-sécurité 2).
add_header Cross-Origin-Opener-Policy "same-origin" always;
`;
}
