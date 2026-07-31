import { describe, it, expect } from 'vitest';
import { ProcessingSection } from './processing-section.enum';

describe('ProcessingSection', () => {
    it('QUEUES should map to "queues" endpoint', () => {
        expect(ProcessingSection.QUEUES).toBe('queues');
    });
    it('TASKS should map to "taken" endpoint', () => {
        expect(ProcessingSection.TASKS).toBe('taken');
    });
    it('ALL should map to "processing" endpoint', () => {
        expect(ProcessingSection.ALL).toBe('processing');
    });
    it('should expose exactly 3 sections', () => {
        const values = Object.values(ProcessingSection);
        expect(values).toHaveLength(3);
        expect(values).toEqual(
            expect.arrayContaining(['queues', 'taken', 'processing'])
        );
    });
});
