import { describe, expect, it } from 'vitest';
import { finalizationDetailsFinalizeVo } from './finalization-details-finalize.vo';

describe('finalizationDetailsFinalizeVo', () => {
    it('trim uniqId et comment', () => {
        const result = finalizationDetailsFinalizeVo({
            uniqId: ' FIN-001 ',
            comment: ' Commentaire ',
        });

        expect(result).toEqual({
            uniqId: 'FIN-001',
            comment: 'Commentaire',
        });
    });

    it('exige uniqId', () => {
        expect(() =>
            finalizationDetailsFinalizeVo({
                uniqId: '  ',
                comment: 'OK',
            })
        ).toThrow('FINALIZATION.DETAILS.FINALIZE.UNIQ_ID_REQUIRED');
    });

    it('exige comment', () => {
        expect(() =>
            finalizationDetailsFinalizeVo({
                uniqId: 'FIN-001',
                comment: '',
            })
        ).toThrow('FINALIZATION.DETAILS.FINALIZE.COMMENT_REQUIRED');
    });
});
