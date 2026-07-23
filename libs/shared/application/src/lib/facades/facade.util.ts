/** Décide s'il faut (re)charger : forcé, sans donnée, ou données périmées. */
export function shouldFetch(
    forceRefresh: boolean,
    hasData: boolean,
    lastFetch: number,
    staleTime: number
): boolean {
    if (forceRefresh) {
        return true;
    }
    return !hasData || Date.now() - lastFetch > staleTime;
}

/** Compare deux filtres (via `toDto()` si présent) — typé, sans `any`. */
export function haveFiltersChanged<TFilter>(
    prev: TFilter | null,
    next: TFilter | null
): boolean {
    const a = normalizeFilter(prev);
    const b = normalizeFilter(next);
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length) {
        return true;
    }
    return !aKeys.every(
        (key, i) => key === bKeys[i] && valuesEqual(a[key], b[key])
    );
}

function normalizeFilter(filter: unknown): Record<string, unknown> {
    if (!filter || typeof filter !== 'object') {
        return {};
    }
    const maybe = filter as { toDto?: () => Record<string, unknown> };
    return typeof maybe.toDto === 'function'
        ? maybe.toDto()
        : (filter as Record<string, unknown>);
}

function valuesEqual(a: unknown, b: unknown): boolean {
    if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && a.every((v, i) => v === b[i]);
    }
    return a === b;
}
