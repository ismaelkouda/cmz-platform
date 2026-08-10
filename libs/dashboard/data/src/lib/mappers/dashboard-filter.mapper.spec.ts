import { describe, expect, it } from 'vitest';
import { Period } from '@cmz/dashboard-domain';
import { dashboardFilterMapper } from './dashboard-filter.mapper';

describe('dashboardFilterMapper', () => {
    it('sérialise le code period string en number pour le wire API', () => {
        expect(
            dashboardFilterMapper({ period: Period.SEVEN_DAYS })
        ).toEqual({ period: 7 });
        expect(
            dashboardFilterMapper({ period: Period.THIRTY_DAYS })
        ).toEqual({ period: 30 });
        expect(
            dashboardFilterMapper({ period: Period.NINETY_DAYS })
        ).toEqual({ period: 90 });
    });
});
