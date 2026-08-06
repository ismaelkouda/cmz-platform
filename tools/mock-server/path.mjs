export const rel = (pathname) => {
    for (const marker of [
        'infrastructures/',
        'territorial-structures/',
        'settings-and-security/',
        'auth/',
        'cms/',
        'report/',
        'variables',
    ]) {
        const i = pathname.indexOf(marker);
        if (i >= 0) return pathname.slice(i);
    }
    // Proxy Angular garde le préfixe `/api` ; les ressources hors marqueurs
    // (`report-states/`, `requests/`, `queues`, …) le perdent ici.
    return pathname.replace(/^\/+/, '').replace(/^api\//, '');
};

/** `REPORT_API_URL` + `requests/…` → chemin mock `report/requests/…` ; on normalise. */
export const normalizeReportPath = (path) => {
    const reportRequests = 'report/requests/';
    if (path.startsWith(reportRequests)) {
        return path.slice('report/'.length);
    }
    return path;
};
