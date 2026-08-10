import { describe, expect, it } from 'vitest';
import { GenericRequiredError } from '@cmz/shared-domain';
import { InvalidPeriodError } from '../errors/invalid-period.error';
import { Period } from '../enums/period.enum';
import { validateDashboardFilter } from './dashboard-filter.validator';

describe('validateDashboardFilter', () => {
    it('valide un contrat avec période connue', () => {
        expect(() =>
            validateDashboardFilter({ period: Period.SEVEN_DAYS })
        ).not.toThrow();
    });

    it('lève GenericRequiredError si period est absent / falsy', () => {
        expect(() => validateDashboardFilter({})).toThrow(GenericRequiredError);
        expect(() => validateDashboardFilter({ period: '' as never })).toThrow(
            GenericRequiredError
        );
    });

    it('lève InvalidPeriodError si period n est pas un code connu', () => {
        expect(() =>
            validateDashboardFilter({ period: '15' as never })
        ).toThrow(InvalidPeriodError);
    });
});
