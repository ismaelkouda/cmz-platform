import { describe, expect, it } from 'vitest';
import { finalizationDetailsFilterVo } from './finalization-details-filter.vo';

describe('finalizationDetailsFilterVo', () => {
    it('trim uniqId et le retourne', () => {
        expect(finalizationDetailsFilterVo({ uniqId: '  REQ-001  ' })).toEqual({
            uniqId: 'REQ-001',
        });
    });

    it('lève si uniqId absent', () => {
        expect(() => finalizationDetailsFilterVo({ uniqId: '   ' })).toThrow(
            'FINALIZATION.DETAILS.FILTER.UNIQ_ID_REQUIRED'
        );
    });
});
