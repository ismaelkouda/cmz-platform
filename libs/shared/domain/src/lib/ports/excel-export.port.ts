import { ExportOptions } from '../interfaces/export-options.interface';

/**
 * Port export Excel — abstraction agnostique.
 * Adaptateur navigateur : `BrowserExcelExportAdapter` (`@cmz/shared-browser`).
 *
 * Interface pure depuis ADR-0024 (Chantier Q). Jeton `EXCEL_EXPORT_PORT`
 * colocalisé dans `@cmz/shared-ui` (`scope:shared`) — consommé par
 * `inject()` depuis plusieurs modules (`processing`, `report-states`,
 * `requests`, `finalization`), qui ne peuvent dépendre entre eux
 * (isolation par `scope:*`, `eslint.config.mjs`) : seule une lib
 * `scope:shared` peut héberger un jeton partagé par tous.
 */
export interface ExcelExportPort {
    exportToExcel(options: ExportOptions): Promise<void>;
}
