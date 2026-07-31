/** Colonne export Excel — contrat agnostique (legacy `ExportColumn`). */
export interface ExportColumn {
    field: string;
    header: string;
    width?: number;
    transform?: (
        value: unknown,
        row: Record<string, unknown>
    ) => string | number;
    alternateRowColor?: boolean;
}
