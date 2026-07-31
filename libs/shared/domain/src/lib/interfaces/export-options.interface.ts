import { ExportColumn } from './export-column.interface';

/** Options export Excel — contrat agnostique (legacy `ExportOptions`). */
export interface ExportOptions {
    fileName: string;
    columns: ExportColumn[];
    data: Record<string, unknown>[];
    sheetName?: string;
    autoFilter?: boolean;
}
