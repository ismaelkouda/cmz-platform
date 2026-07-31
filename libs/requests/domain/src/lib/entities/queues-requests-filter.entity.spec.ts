import { describe, expect, it } from 'vitest';
import { queuesRequestsFilterEntity } from '../entities/queues-requests-filter.entity';

describe('queuesRequestsFilterEntity', () => {
    it('résout endDate ouverte via resolveOpenEndedEndDate', () => {
        const start = new Date('2026-01-01T00:00:00Z');

        const result = queuesRequestsFilterEntity({
            startDate: start,
        });

        expect(result.startDate).toEqual(start);
        expect(result.endDate).toBeInstanceOf(Date);
        const endDate = result.endDate as Date;
        expect(endDate.getTime()).toBeGreaterThan(start.getTime());
    });
});
