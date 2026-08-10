import { describe, expect, it } from 'vitest';
import { isPeriod, Period } from './period.enum';

describe('Period / isPeriod', () => {
    it('accepte les 4 codes wire stables', () => {
        expect(isPeriod(Period.SEVEN_DAYS)).toBe(true);
        expect(isPeriod(Period.THIRTY_DAYS)).toBe(true);
        expect(isPeriod(Period.SIXTY_DAYS)).toBe(true);
        expect(isPeriod(Period.NINETY_DAYS)).toBe(true);
        expect(isPeriod('7')).toBe(true);
        expect(isPeriod('30')).toBe(true);
    });

    it('rejette les valeurs hors set', () => {
        expect(isPeriod('15')).toBe(false);
        expect(isPeriod(7)).toBe(false);
        expect(isPeriod(null)).toBe(false);
        expect(isPeriod(undefined)).toBe(false);
        expect(isPeriod('')).toBe(false);
    });
});
