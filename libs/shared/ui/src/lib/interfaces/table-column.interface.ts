/** Définition d'une colonne de table (contrat du composant `cmz-table`). */
export interface TableColumn {
    field: string;
    header: string;
    width?: string;
    class?: string;
    /** Type de rendu de cellule optionnel (défaut : texte). */
    type?: string;
}
