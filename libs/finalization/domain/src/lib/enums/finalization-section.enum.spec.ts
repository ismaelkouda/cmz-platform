import { describe, it, expect } from 'vitest';
import { FinalizationSection } from './finalization-section.enum';

describe('FinalizationSection', () => {
    it('QUEUES should map to finalizations/queues endpoint', () => {
        expect(FinalizationSection.QUEUES).toBe('finalizations/queues');
    });
    it('TASKS should map to finalizations/task-baskets endpoint', () => {
        expect(FinalizationSection.TASKS).toBe('finalizations/task-baskets');
    });
    it('ALL should map to finalizations endpoint', () => {
        expect(FinalizationSection.ALL).toBe('finalizations');
    });
    it('should expose exactly 3 sections', () => {
        const values = Object.values(FinalizationSection);
        expect(values).toHaveLength(3);
        expect(values).toEqual(
            expect.arrayContaining([
                'finalizations/queues',
                'finalizations/task-baskets',
                'finalizations',
            ])
        );
    });
});
