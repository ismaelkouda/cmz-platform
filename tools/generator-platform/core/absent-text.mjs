// X5 C5 (P2, B+) : texte d'absence d'une liaison de données, donnée de la
// CONCEPTION. La composition générée le publie en constante scellée
// (`absentText.<liaison>`) ; la page le lit par ce chemin et ne le recopie
// jamais. Borne : LISTE BLANCHE du diagnostic tiers aveugle (2026-11-12, §6).
// - lettres latines (A–Z, a–z, U+00C0–U+00FF sauf × et ÷, Œ, œ, Ÿ) ;
// - chiffres ; ponctuation `. , ; : ! ? ' ’ ( ) « » … – — / -` ;
// - espace U+0020 seule, entre deux groupes ; au moins une lettre ;
// - 1 à 40 caractères, tous dans le plan de base (unités UTF-16 = points
//   de code).
// Le motif se compile sans drapeau `u`, comme `pattern` dans validate-ir.

export const ABSENT_TEXT_MAX = 40;

const LETTERS =
    'A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u00FF\\u0152\\u0153\\u0178';
const ALLOWED = `${LETTERS}0-9.,;:!?'\\u2019()\\u00AB\\u00BB\\u2026\\u2013\\u2014/-`;

// Motif du tiers, à l'identique (sonde probe-charset : 34 cas, 0 échec).
export const ABSENT_TEXT_PATTERN = `^(?=[^${LETTERS}]*[${LETTERS}])[${ALLOWED}]+(?: [${ALLOWED}]+)*$`;

const PATTERN = new RegExp(ABSENT_TEXT_PATTERN);

// Refus nommé, ou undefined si le texte est valide.
export function absentTextError(text) {
    if (typeof text !== 'string')
        return 'PAGE_ABSENT_TEXT_INVALID: absent_text must be a string';
    if (text.length < 1 || text.length > ABSENT_TEXT_MAX)
        return `PAGE_ABSENT_TEXT_INVALID: absent_text must have 1 to ${ABSENT_TEXT_MAX} characters`;
    if (!PATTERN.test(text))
        return 'PAGE_ABSENT_TEXT_INVALID: absent_text must use the allowed letters, digits, punctuation and single inner spaces, with at least one letter';
    return undefined;
}
