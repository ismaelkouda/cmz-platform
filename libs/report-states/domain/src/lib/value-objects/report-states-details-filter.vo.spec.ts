import { describe, expect, it } from 'vitest';
import { reportStatesDetailsFilterVo } from './report-states-details-filter.vo';

describe('reportStatesDetailsFilterVo', () => {
    it('trim uniqId et le retourne', () => {
        expect(reportStatesDetailsFilterVo({ uniqId: '  REQ-001  ' })).toEqual({
            uniqId: 'REQ-001',
        });
    });

    it('lève si uniqId absent', () => {
        expect(() => reportStatesDetailsFilterVo({ uniqId: '   ' })).toThrow(
            'REQUESTS.DETAILS.FILTER.UNIQ_ID_REQUIRED'
        );
    });
});
