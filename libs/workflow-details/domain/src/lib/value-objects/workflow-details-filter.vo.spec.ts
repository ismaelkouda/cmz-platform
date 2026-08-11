import { describe, expect, it } from 'vitest';
import { workflowDetailsFilterVo } from './workflow-details-filter.vo';

describe('workflowDetailsFilterVo', () => {
    it('trim uniqId et le retourne', () => {
        expect(
            workflowDetailsFilterVo({ uniqId: '  REQ-001  ' }, 'TEST_MODULE')
        ).toEqual({
            uniqId: 'REQ-001',
        });
    });

    it('lève avec la clé préfixée par modulePrefix si uniqId absent', () => {
        expect(() =>
            workflowDetailsFilterVo({ uniqId: '   ' }, 'TEST_MODULE')
        ).toThrow('TEST_MODULE.DETAILS.FILTER.UNIQ_ID_REQUIRED');
        expect(() =>
            workflowDetailsFilterVo({ uniqId: '   ' }, 'REPORT_STATES')
        ).toThrow('REPORT_STATES.DETAILS.FILTER.UNIQ_ID_REQUIRED');
        expect(() =>
            workflowDetailsFilterVo({ uniqId: '   ' }, 'REQUESTS')
        ).toThrow('REQUESTS.DETAILS.FILTER.UNIQ_ID_REQUIRED');
    });
});
