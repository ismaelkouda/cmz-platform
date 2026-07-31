import { ExcelExportPort } from '@cmz/shared-domain';
import { ExportColumn } from '@cmz/shared-domain';
import { formatDate } from '../formatters/format-date.function';
import { TableColumn } from '../interfaces/table-column.interface';

export interface ExportTableToExcelParams<T extends Record<string, unknown>> {
    fileName: string;
    sheetName: string;
    columns: TableColumn[];
    rows: T[];
    translate: (key: string) => string;
}

/** Construit les colonnes wire et délègue au port Excel. */
export async function exportTableToExcel<T extends Record<string, unknown>>(
    port: ExcelExportPort,
    params: ExportTableToExcelParams<T>
): Promise<void> {
    const exportColumns = buildExportColumns(
        params.columns,
        params.rows,
        params.translate
    );

    await port.exportToExcel({
        fileName: params.fileName,
        columns: exportColumns,
        data: params.rows,
        sheetName: params.sheetName,
        autoFilter: true,
    });
}

function buildExportColumns<T extends Record<string, unknown>>(
    cols: TableColumn[],
    rows: T[],
    translate: (key: string) => string
): ExportColumn[] {
    return cols
        .filter((col) => col.field !== '__action')
        .map((col) => {
            let width = 15;
            if (col.width) {
                const num = Number.parseFloat(col.width);
                width = Number.isNaN(num) ? 15 : num;
            }

            return {
                field: col.field,
                header: translate(col.header),
                width,
                transform: (value: unknown, row: Record<string, unknown>) =>
                    transformExportCell(col.field, value, row, rows),
            };
        });
}

function transformExportCell<T extends Record<string, unknown>>(
    field: string,
    value: unknown,
    row: Record<string, unknown>,
    rows: T[]
): string | number {
    if (field === '__index') {
        const index = rows.indexOf(row as T);
        return index >= 0 ? String(index + 1) : '';
    }
    if (field === 'reportedAt' && value) {
        return formatDate(String(value));
    }
    if (Array.isArray(value)) {
        return value.join(', ');
    }
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'number') {
        return value;
    }
    return String(value);
}
