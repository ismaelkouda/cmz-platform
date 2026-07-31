import { describe, expect, it } from 'vitest';
import { requestsDetailsFilterVo } from './requests-details-filter.vo';

describe('requestsDetailsFilterVo', () => {
    it('trim uniqId et le retourne', () => {
        expect(requestsDetailsFilterVo({ uniqId: '  REQ-001  ' })).toEqual({
            uniqId: 'REQ-001',
        });
    });

    it('lève si uniqId absent', () => {
        expect(() => requestsDetailsFilterVo({ uniqId: '   ' })).toThrow(
            'REQUESTS.DETAILS.FILTER.UNIQ_ID_REQUIRED'
        );
    });
});
