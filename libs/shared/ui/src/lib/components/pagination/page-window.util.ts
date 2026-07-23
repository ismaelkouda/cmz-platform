export type PageToken = number | 'ellipsis';

/**
 * Construit la fenêtre de pages à afficher autour de la page courante, avec des
 * ellipses aux extrémités. Logique pure (aucune dépendance Angular) → testable
 * en isolation.
 *
 * @param current page active (1-based)
 * @param last dernière page (>= 1)
 * @param siblings nombre de pages de part et d'autre de la page active
 * @param boundary nombre de pages fixes à chaque extrémité
 */
export function pageWindow(
    current: number,
    last: number,
    siblings = 1,
    boundary = 1
): PageToken[] {
    const total = Math.max(1, last);
    const page = Math.min(Math.max(1, current), total);

    const start = Math.max(page - siblings, boundary + 1);
    const end = Math.min(page + siblings, total - boundary);

    const tokens: PageToken[] = [];

    for (let i = 1; i <= Math.min(boundary, total); i++) {
        tokens.push(i);
    }
    if (start > boundary + 1) {
        tokens.push('ellipsis');
    }
    for (let i = start; i <= end; i++) {
        tokens.push(i);
    }
    if (end < total - boundary) {
        tokens.push('ellipsis');
    }
    for (
        let i = Math.max(total - boundary + 1, boundary + 1);
        i <= total;
        i++
    ) {
        tokens.push(i);
    }
    return tokens;
}
