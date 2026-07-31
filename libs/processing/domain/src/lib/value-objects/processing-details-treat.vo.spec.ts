import { describe, expect, it } from 'vitest';
import { processingDetailsTreatVo } from './processing-details-treat.vo';

describe('processingDetailsTreatVo', () => {
    it('trim uniqId et comment optionnel', () => {
        const result = processingDetailsTreatVo({
            uniqId: ' PROC-001 ',
            comment: ' Commentaire ',
        });

        expect(result).toEqual({
            uniqId: 'PROC-001',
            comment: 'Commentaire',
        });
    });

    it('exige uniqId', () => {
        expect(() =>
            processingDetailsTreatVo({
                uniqId: '  ',
            })
        ).toThrow('PROCESSING.DETAILS.TREAT.UNIQ_ID_REQUIRED');
    });

    it('normalise comment vide vers undefined', () => {
        const result = processingDetailsTreatVo({
            uniqId: 'PROC-001',
            comment: '   ',
        });

        expect(result.comment).toBeUndefined();
    });
});
