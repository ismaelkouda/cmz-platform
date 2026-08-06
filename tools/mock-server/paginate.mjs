export const PER_PAGE = 10;

export function paginate(items, pageStr) {
    const page = Math.max(1, Number(pageStr) || 1);
    const total = items.length;
    const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
    const start = (page - 1) * PER_PAGE;
    const data = items.slice(start, start + PER_PAGE);
    return {
        current_page: page,
        data,
        first_page_url: '',
        last_page: lastPage,
        last_page_url: '',
        next_page_url: null,
        prev_page_url: null,
        path: '',
        per_page: PER_PAGE,
        from: start + 1,
        to: start + data.length,
        total,
        links: [],
    };
}

/** Export métier — toutes les lignes filtrées dans une seule « page » (sans pagination UI). */
export function paginateAll(items) {
    const total = items.length;
    return {
        current_page: 1,
        data: items,
        first_page_url: '',
        last_page: 1,
        last_page_url: '',
        next_page_url: null,
        prev_page_url: null,
        path: '',
        per_page: total,
        from: total > 0 ? 1 : 0,
        to: total,
        total,
        links: [],
    };
}
