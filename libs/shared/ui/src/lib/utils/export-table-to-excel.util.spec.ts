import { ExcelExportPort, ExportOptions } from '@cmz/shared-domain';
import { describe, expect, it, vi } from 'vitest';
import { TableColumn } from '../interfaces/table-column.interface';
import { exportTableToExcel } from './export-table-to-excel.util';

/**
 * T12-3 (P1, 2026-08-13) — jamais testé, ~4 appelants. Logique de
 * transformation de cellule (`buildExportColumns`/`transformExportCell`,
 * privées) testable indépendamment du DOM en capturant les `ExportOptions`
 * passées au port (interface, pas de dépendance navigateur/exceljs) —
 * contrairement à `BrowserExcelExportAdapter` (génération binaire réelle
 * + DOM, hors périmètre d'un test unitaire, mieux couvert par un e2e).
 */
function makeFakePort(): {
    port: ExcelExportPort;
    captured: ExportOptions[];
} {
    const captured: ExportOptions[] = [];
    return {
        port: {
            exportToExcel: vi.fn(async (options: ExportOptions) => {
                captured.push(options);
            }),
        },
        captured,
    };
}

const translate = (key: string) => `t:${key}`;

describe('exportTableToExcel', () => {
    it('filtre la colonne __action (jamais exportable) et traduit les en-têtes', async () => {
        const { port, captured } = makeFakePort();
        const columns: TableColumn[] = [
            { field: 'name', header: 'COL.NAME' },
            { field: '__action', header: 'COL.ACTIONS' },
        ];

        await exportTableToExcel(port, {
            fileName: 'export',
            sheetName: 'Feuille',
            columns,
            rows: [{ name: 'A' }],
            translate,
        });

        const exported = captured[0];
        expect(exported.columns).toHaveLength(1);
        expect(exported.columns[0]).toMatchObject({
            field: 'name',
            header: 't:COL.NAME',
        });
    });

    it('parse width en nombre, retombe sur 15 si non numérique ou absent', async () => {
        const { port, captured } = makeFakePort();
        const columns: TableColumn[] = [
            { field: 'a', header: 'A', width: '200px' },
            { field: 'b', header: 'B', width: 'not-a-number' },
            { field: 'c', header: 'C' },
        ];

        await exportTableToExcel(port, {
            fileName: 'x',
            sheetName: 'x',
            columns,
            rows: [],
            translate,
        });

        const [colA, colB, colC] = captured[0].columns;
        expect(colA.width).toBe(200);
        expect(colB.width).toBe(15);
        expect(colC.width).toBe(15);
    });

    it('transform() du champ __index retourne la position 1-based de la ligne dans le tableau', async () => {
        const { port, captured } = makeFakePort();
        const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];

        await exportTableToExcel(port, {
            fileName: 'x',
            sheetName: 'x',
            columns: [{ field: '__index', header: 'N°' }],
            rows,
            translate,
        });

        const transform = captured[0].columns[0].transform;
        expect(transform?.(undefined, rows[0])).toBe('1');
        expect(transform?.(undefined, rows[2])).toBe('3');
    });

    it('transform() du champ __index retourne une chaîne vide si la ligne n’est pas trouvée dans rows', async () => {
        const { port, captured } = makeFakePort();
        const rows = [{ id: 1 }];

        await exportTableToExcel(port, {
            fileName: 'x',
            sheetName: 'x',
            columns: [{ field: '__index', header: 'N°' }],
            rows,
            translate,
        });

        const transform = captured[0].columns[0].transform;
        expect(transform?.(undefined, { id: 'not-in-rows' })).toBe('');
    });

    it('transform() du champ reportedAt formate la date, sauf si la valeur est vide/falsy', async () => {
        const { port, captured } = makeFakePort();

        await exportTableToExcel(port, {
            fileName: 'x',
            sheetName: 'x',
            columns: [{ field: 'reportedAt', header: 'Date' }],
            rows: [{}],
            translate,
        });

        const transform = captured[0].columns[0].transform;
        expect(transform?.('', {})).toBe('');
        expect(transform?.(null, {})).toBe('');
        // Valeur non vide : délègue à formatDate() (testé séparément) —
        // ici on vérifie juste que ce n'est pas la valeur brute non formatée.
        expect(transform?.('2026-01-01 10:00:00', {})).not.toBe(
            '2026-01-01 10:00:00'
        );
    });

    it('transform() joint un tableau en chaîne séparée par virgule', async () => {
        const { port, captured } = makeFakePort();

        await exportTableToExcel(port, {
            fileName: 'x',
            sheetName: 'x',
            columns: [{ field: 'tags', header: 'Tags' }],
            rows: [{}],
            translate,
        });

        const transform = captured[0].columns[0].transform;
        expect(transform?.(['a', 'b', 'c'], {})).toBe('a, b, c');
        expect(transform?.([], {})).toBe('');
    });

    it('transform() convertit null/undefined en chaîne vide, préserve les nombres, stringifie le reste', async () => {
        const { port, captured } = makeFakePort();

        await exportTableToExcel(port, {
            fileName: 'x',
            sheetName: 'x',
            columns: [{ field: 'other', header: 'Other' }],
            rows: [{}],
            translate,
        });

        const transform = captured[0].columns[0].transform;
        expect(transform?.(null, {})).toBe('');
        expect(transform?.(undefined, {})).toBe('');
        expect(transform?.(42, {})).toBe(42);
        expect(transform?.(true, {})).toBe('true');
    });

    it('délègue à port.exportToExcel avec autoFilter toujours true et fileName/sheetName/rows transmis tels quels', async () => {
        const { port, captured } = makeFakePort();
        const rows = [{ a: 1 }];

        await exportTableToExcel(port, {
            fileName: 'mon-export',
            sheetName: 'Ma feuille',
            columns: [{ field: 'a', header: 'A' }],
            rows,
            translate,
        });

        expect(captured[0].fileName).toBe('mon-export');
        expect(captured[0].sheetName).toBe('Ma feuille');
        expect(captured[0].data).toBe(rows);
        expect(captured[0].autoFilter).toBe(true);
    });
});
