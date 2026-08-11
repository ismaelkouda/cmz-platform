import { describe, expect, it } from 'vitest';
import { workflowDetailsFilterEntity } from './workflow-details-filter.entity';

describe('workflowDetailsFilterEntity', () => {
    it('projette uniqId depuis le contrat filtre', () => {
        expect(workflowDetailsFilterEntity({ uniqId: 'REQ-001' })).toEqual({
            uniqId: 'REQ-001',
        });
    });
});
