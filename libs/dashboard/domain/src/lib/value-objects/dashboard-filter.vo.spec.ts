import { describe, expect, it } from 'vitest';
import { GenericRequiredError } from '@cmz/shared-domain';
import { Period } from '../enums/period.enum';
import { dashboardFilterVo } from './dashboard-filter.vo';

describe('dashboardFilterVo', () => {
    it('retourne le contrat validé (period requis)', () => {
        expect(dashboardFilterVo({ period: Period.THIRTY_DAYS })).toEqual({
            period: Period.THIRTY_DAYS,
        });
    });

    it('propage l erreur de validation', () => {
        expect(() => dashboardFilterVo({})).toThrow(GenericRequiredError);
    });
});
