/** Onglet-lien de navigation (route + libellé + query params optionnels). */
export interface TabLink {
    value: string;
    route: string;
    label: string;
    icon?: string;
    queryParams?: Record<string, string>;
}
