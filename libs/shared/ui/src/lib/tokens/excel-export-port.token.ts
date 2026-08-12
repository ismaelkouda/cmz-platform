import { InjectionToken } from '@angular/core';
import { ExcelExportPort } from '@cmz/shared-domain';

/**
 * Jeton d'injection Angular pour `ExcelExportPort` (ADR-0024).
 *
 * Colocalisé dans `@cmz/shared-ui` : consommé par `inject()` depuis
 * plusieurs modules fonctionnels (`processing`, `report-states`,
 * `requests`, `finalization`), qui n'ont pas le droit de dépendre les uns
 * des autres (isolation par `scope:*`, `eslint.config.mjs`). Seule une lib
 * `scope:shared` peut héberger un jeton consommé par tous.
 */
export const EXCEL_EXPORT_PORT = new InjectionToken<ExcelExportPort>(
    'ExcelExportPort'
);
