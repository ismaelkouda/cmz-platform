import { describe, expect, it } from 'vitest';
import { ProcessingAllState } from '../enums/processing-all-state.enum';
import { allProcessingFilterVo } from './all-processing-filter.vo';

describe('allProcessingFilterVo', () => {
    it('normalise uniqId et source sans re-parser state', () => {
        const vo = allProcessingFilterVo({
            uniqId: '  PROC-A-1  ',
            source: '  sms  ',
            state: ProcessingAllState.TERMINATED,
        });

        expect(vo.uniqId).toBe('PROC-A-1');
        expect(vo.source).toBe('sms');
        expect(vo.state).toBe(ProcessingAllState.TERMINATED);
    });
});
