/**
 * Forme partagée d'une option de select. Remplace les « SelectEntity » par module
 * (wrappers pass-through sans logique) par un simple type.
 */
export interface SelectOption {
    value: string;
    label: string;
}
