/** Types de champ de filtre supportés par `cmz-filter`. */
export type FilterFieldType = 'text' | 'number' | 'select' | 'date';

export interface FilterOption {
    label: string;
    value: string | number | boolean;
}

/** Déclaration d'un champ de filtre (dirigée par la donnée). */
export interface FilterField {
    type: FilterFieldType;
    /** Nom du `FormControl` associé. */
    name: string;
    /** Clé i18n du libellé. */
    label: string;
    placeholder?: string;
    /** Options (type `select`). */
    options?: FilterOption[];
    /** Classes utilitaires additionnelles (largeur de colonne, etc.). */
    class?: string;
}

/**
 * Construit des options de filtre à partir d'un enum i18n
 * (`{ CLE: 'I18N.KEY' }`) : `value` = valeur d'enum, `label` = traduction.
 */
export function enumToFilterOptions<T extends Record<string, string>>(
    e: T,
    translate: (key: string) => string
): FilterOption[] {
    return Object.values(e).map((value) => ({
        label: translate(value),
        value,
    }));
}
