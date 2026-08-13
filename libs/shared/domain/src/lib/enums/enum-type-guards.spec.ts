import { describe, expect, it } from 'vitest';
import { isRole, Role } from './role.enum';
import { isPlatform, Platform } from './platform.enum';
import { isTypeMedia, TypeMedia } from './type-media.enum';
import { isTelecomOperator, TelecomOperator } from './telecom-operator.enum';
import { isReportType, ReportType } from './report-type.enum';
import { isLocationMethod, LocationMethod } from './location-method.enum';
import { isLocationType, LocationType } from './location-type.enum';
import { isLocationName, LocationName } from './location-name.enum';
import { isMediaStatus, MediaStatus } from './media-status.enum';
import { isPriorityLevel, PriorityLevel } from './priority-level.enum';
import { isReportSource, ReportSource } from './report-source.enum';
import { isTypeReport, TypeReport } from './type-report.enum';

/**
 * T12-3 (P1/P2, 2026-08-13) — 11 type guards jamais testés, tous consommés
 * directement par les mappers `shared/data` (ex. `LocationMethodMapper`,
 * `LocationTypeMapper`) pour valider une valeur wire avant de la faire
 * transiter en domaine. Même pattern exact (`Set.has()`) répété 11 fois —
 * regroupés en un seul fichier plutôt que 11 fichiers quasi identiques.
 * Risque de régression silencieuse : si une valeur est ajoutée à l'enum
 * `const` mais que le `Set` (dérivé de `Object.values`) n'est pas
 * recalculé au bon endroit, ou si un guard est copié-collé vers un autre
 * enum sans changer sa source, le guard accepte/rejette la mauvaise
 * famille de valeurs sans qu'aucun test ne le révèle avant ce fichier.
 */
describe('Type guards d’enums domaine (pattern Set.has())', () => {
    it.each([
        { name: 'isRole', guard: isRole, values: Object.values(Role) },
        {
            name: 'isPlatform',
            guard: isPlatform,
            values: Object.values(Platform),
        },
        {
            name: 'isTypeMedia',
            guard: isTypeMedia,
            values: Object.values(TypeMedia),
        },
        {
            name: 'isTelecomOperator',
            guard: isTelecomOperator,
            values: Object.values(TelecomOperator),
        },
        {
            name: 'isReportType',
            guard: isReportType,
            values: Object.values(ReportType),
        },
        {
            name: 'isLocationMethod',
            guard: isLocationMethod,
            values: Object.values(LocationMethod),
        },
        {
            name: 'isLocationType',
            guard: isLocationType,
            values: Object.values(LocationType),
        },
        {
            name: 'isLocationName',
            guard: isLocationName,
            values: Object.values(LocationName),
        },
        {
            name: 'isMediaStatus',
            guard: isMediaStatus,
            values: Object.values(MediaStatus),
        },
        {
            name: 'isPriorityLevel',
            guard: isPriorityLevel,
            values: Object.values(PriorityLevel),
        },
        {
            name: 'isReportSource',
            guard: isReportSource,
            values: Object.values(ReportSource),
        },
        {
            name: 'isTypeReport',
            guard: isTypeReport,
            values: Object.values(TypeReport),
        },
    ])(
        '$name accepte exactement les valeurs déclarées de son propre enum, rien d’autre',
        ({ guard, values }) => {
            for (const value of values) {
                expect(guard(value)).toBe(true);
            }
            expect(guard('valeur-totalement-inventee')).toBe(false);
            expect(guard('')).toBe(false);
        }
    );

    it('les 11 guards ne se confondent pas entre enums voisins (ex. isRole rejette les valeurs de TypeReport)', () => {
        // Garde spécifique contre le risque documenté ci-dessus : un guard
        // copié-collé vers le mauvais enum source resterait syntaxiquement
        // correct (même signature `(value: string) => boolean`) mais
        // accepterait la mauvaise famille de valeurs — indétectable par le
        // test paramétré seul, qui ne teste chaque guard que contre son
        // propre enum déclaré.
        expect(isRole(TypeReport.REQUESTS)).toBe(false);
        expect(isPlatform(TelecomOperator.MTN)).toBe(false);
        expect(isLocationMethod(LocationType.GPS)).toBe(false);
        expect(isReportType(ReportSource.APP)).toBe(false);
        expect(isMediaStatus(PriorityLevel.HIGH)).toBe(false);
    });
});
