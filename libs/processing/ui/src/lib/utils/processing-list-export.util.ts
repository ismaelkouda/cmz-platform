import { NotificationPort } from '@cmz/shared-application';
import { ExcelExportPort } from '@cmz/shared-domain';
import { exportTableToExcel, TableColumn } from '@cmz/shared-ui';

export type ProcessingListVolet = 'queues' | 'tasks' | 'all';

/** Tooltip export — `totalCount` = total filtré backend (meta pagination), pas la page courante. */
export function processingListExportTooltip(
    translate: (key: string) => string,
    ns: string,
    canExport: boolean,
    totalCount: number
): string {
    if (!canExport) {
        return translate(`${ns}.TOOLTIP.NO_PERMISSION_EXPORT`);
    }
    if (totalCount < 1) {
        return translate(`${ns}.TOOLTIP.NO_EXPORT`);
    }
    return translate(`${ns}.TOOLTIP.EXPORT`).replace(
        '{nb}',
        String(totalCount)
    );
}

export function processingListExportDisabled(
    canExport: boolean,
    totalCount: number,
    loading: boolean,
    exporting: boolean
): boolean {
    return !canExport || totalCount < 1 || loading || exporting;
}

/**
 * Export métier : récupère le dataset complet via `fetchRows` (backend, mêmes filtres/RBAC),
 * puis génère le fichier `.xlsx` côté client (ExcelJS).
 */
export async function exportProcessingList<TRow>(params: {
    excelExport: ExcelExportPort;
    notification: NotificationPort;
    translate: (key: string) => string;
    ns: string;
    volet: ProcessingListVolet;
    canExport: boolean;
    totalCount: number;
    loading: boolean;
    exporting: boolean;
    columns: TableColumn[];
    fetchRows: () => Promise<TRow[]>;
}): Promise<void> {
    const tooltip = processingListExportTooltip(
        params.translate,
        params.ns,
        params.canExport,
        params.totalCount
    );

    if (!params.canExport) {
        params.notification.error(tooltip);
        return;
    }

    if (params.loading || params.exporting || params.totalCount < 1) {
        params.notification.error(
            params.totalCount < 1
                ? params.translate(`${params.ns}.TOOLTIP.NO_EXPORT`)
                : params.translate('EXPORT.NO_DATA')
        );
        return;
    }

    try {
        const rows = await params.fetchRows();
        if (!rows.length) {
            params.notification.error(params.translate('EXPORT.NO_DATA'));
            return;
        }

        await exportTableToExcel(params.excelExport, {
            fileName: `cmz-processing-${params.volet}`,
            sheetName: params.translate(`${params.ns}.TITLE`),
            columns: params.columns,
            rows: rows as Record<string, unknown>[],
            translate: params.translate,
        });
    } catch {
        params.notification.error(params.translate('EXPORT.ERROR'));
    }
}
