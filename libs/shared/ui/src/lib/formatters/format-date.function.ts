/**
 * Formate une date d'API (avec/sans `T`, avec/sans `Z`) en chaîne locale.
 * Renvoie la valeur brute si non parsable.
 */
export function formatDate(value: string): string {
    if (!value) {
        return '-';
    }
    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const withTimezone = normalized.endsWith('Z')
        ? normalized
        : `${normalized}Z`;
    const date = new Date(withTimezone);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
