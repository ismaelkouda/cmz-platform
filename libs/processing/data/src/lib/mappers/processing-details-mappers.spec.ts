import { describe, expect, it } from 'vitest';
import {
    ProcessingDetailsTakeEntity,
    ProcessingDetailsTreatEntity,
} from '@cmz/processing-domain';
import { processingDetailsFilterMapper } from './processing-details-filter.mapper';
import { processingDetailsTakeMapper } from './processing-details-take.mapper';
import { processingDetailsTreatMapper } from './processing-details-treat.mapper';

describe('processingDetailsFilterMapper', () => {
    it('mappe uniqId vers uniq_id', () => {
        expect(processingDetailsFilterMapper({ uniqId: 'PROC-001' })).toEqual({
            uniq_id: 'PROC-001',
        });
    });
});

describe('processingDetailsTakeMapper', () => {
    it('mappe uniqId vers uniq_id', () => {
        const entity = new ProcessingDetailsTakeEntity('PROC-001');

        expect(processingDetailsTakeMapper(entity)).toEqual({
            uniq_id: 'PROC-001',
        });
    });
});

describe('processingDetailsTreatMapper', () => {
    it('mappe uniqId et comment optionnel', () => {
        const entity = new ProcessingDetailsTreatEntity(
            'PROC-001',
            'Traitement OK'
        );

        expect(processingDetailsTreatMapper(entity)).toEqual({
            uniq_id: 'PROC-001',
            comment: 'Traitement OK',
        });
    });

    it('omet comment si absent', () => {
        const entity = new ProcessingDetailsTreatEntity('PROC-002');

        expect(processingDetailsTreatMapper(entity)).toEqual({
            uniq_id: 'PROC-002',
        });
    });
});
