import { ExportOptions } from '../interfaces/export-options.interface';

/**
 * Port export Excel — abstraction agnostique.
 * Adaptateur navigateur : `BrowserExcelExportAdapter` (`@cmz/shared-browser`).
 */
export abstract class ExcelExportPort {
    abstract exportToExcel(options: ExportOptions): Promise<void>;
}
