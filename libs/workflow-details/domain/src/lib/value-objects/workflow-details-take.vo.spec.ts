import { describe, expect, it } from 'vitest';
import { workflowDetailsTakeVo } from './workflow-details-take.vo';

describe('workflowDetailsTakeVo', () => {
    it('trim uniqId et le retourne', () => {
        expect(
            workflowDetailsTakeVo({ uniqId: '  REQ-001  ' }, 'TEST_MODULE')
        ).toEqual({
            uniqId: 'REQ-001',
        });
    });

    it('lève avec la clé préfixée par modulePrefix si uniqId absent', () => {
        expect(() =>
            workflowDetailsTakeVo({ uniqId: '' }, 'REPORT_STATES')
        ).toThrow('REPORT_STATES.DETAILS.TAKE.UNIQ_ID_REQUIRED');
        expect(() => workflowDetailsTakeVo({ uniqId: '' }, 'REQUESTS')).toThrow(
            'REQUESTS.DETAILS.TAKE.UNIQ_ID_REQUIRED'
        );
    });
});
