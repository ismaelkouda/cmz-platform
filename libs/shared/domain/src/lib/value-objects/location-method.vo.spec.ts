import { describe, expect, it } from 'vitest';
import { LocationMethodVO } from './location-method.vo';
import { LocationMethod } from '../enums/location-method.enum';

/**
 * Chantier L (onzième passe, 2026-08-04) — `LocationMethodVO` utilise des
 * instances singleton (`static readonly auto/manual`), jamais réellement
 * instanciées via `new` — `fromEnum` doit toujours renvoyer la même
 * référence pour la même valeur (`equals`/`===` cohérents). Jamais testé.
 */
describe('LocationMethodVO', () => {
    it('fromEnum(AUTO) retourne le singleton auto', () => {
        expect(LocationMethodVO.fromEnum(LocationMethod.AUTO)).toBe(
            LocationMethodVO.auto
        );
    });

    it('fromEnum(MANUAL) retourne le singleton manual', () => {
        expect(LocationMethodVO.fromEnum(LocationMethod.MANUAL)).toBe(
            LocationMethodVO.manual
        );
    });

    it('isAuto()/isManual() sont mutuellement exclusifs', () => {
        expect(LocationMethodVO.auto.isAuto()).toBe(true);
        expect(LocationMethodVO.auto.isManual()).toBe(false);
        expect(LocationMethodVO.manual.isAuto()).toBe(false);
        expect(LocationMethodVO.manual.isManual()).toBe(true);
    });

    it('toEnum() restitue la valeur wire d’origine', () => {
        expect(LocationMethodVO.auto.toEnum()).toBe(LocationMethod.AUTO);
        expect(LocationMethodVO.manual.toEnum()).toBe(LocationMethod.MANUAL);
    });

    it('toString() restitue la valeur wire (utilisable en interpolation)', () => {
        expect(`${LocationMethodVO.auto}`).toBe('auto');
    });

    it('equals() compare par valeur, y compris entre deux appels fromEnum distincts', () => {
        const a = LocationMethodVO.fromEnum(LocationMethod.AUTO);
        const b = LocationMethodVO.fromEnum(LocationMethod.AUTO);
        expect(a.equals(b)).toBe(true);
        expect(a.equals(LocationMethodVO.manual)).toBe(false);
    });
});
