import { describe, it, expect } from 'vitest';
import { RequestsSection } from './requests-section.enum';

describe('RequestsSection', () => {
    it('QUEUES should map to requests/queues endpoint', () => {
        expect(RequestsSection.QUEUES).toBe('requests/queues');
    });
    it('TASKS should map to requests/task-baskets endpoint', () => {
        expect(RequestsSection.TASKS).toBe('requests/task-baskets');
    });
    it('ALL should map to requests/qualified endpoint', () => {
        expect(RequestsSection.ALL).toBe('requests/qualified');
    });
    it('should expose exactly 3 sections', () => {
        const values = Object.values(RequestsSection);
        expect(values).toHaveLength(3);
        expect(values).toEqual(
            expect.arrayContaining([
                'requests/queues',
                'requests/task-baskets',
                'requests/qualified',
            ])
        );
    });
});
