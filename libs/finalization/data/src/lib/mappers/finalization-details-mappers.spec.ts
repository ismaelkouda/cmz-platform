import { describe, expect, it } from 'vitest';
import {
    FinalizationDetailsFinalizeEntity,
    FinalizationDetailsTakeEntity,
} from '@cmz/finalization-domain';
import { finalizationDetailsFinalizeMapper } from './finalization-details-finalize.mapper';
import { finalizationDetailsFilterMapper } from './finalization-details-filter.mapper';
import { finalizationDetailsTakeMapper } from './finalization-details-take.mapper';

describe('finalizationDetailsFilterMapper', () => {
    it('mappe uniqId vers uniq_id', () => {
        expect(finalizationDetailsFilterMapper({ uniqId: 'FIN-001' })).toEqual({
            uniq_id: 'FIN-001',
        });
    });
});

describe('finalizationDetailsTakeMapper', () => {
    it('mappe uniqId vers uniq_id', () => {
        const entity = new FinalizationDetailsTakeEntity('FIN-001');

        expect(finalizationDetailsTakeMapper(entity)).toEqual({
            uniq_id: 'FIN-001',
        });
    });
});

describe('finalizationDetailsFinalizeMapper', () => {
    it('mappe uniqId et comment vers le wire snake_case', () => {
        const entity = new FinalizationDetailsFinalizeEntity(
            'FIN-001',
            'Commentaire finalisation'
        );

        expect(finalizationDetailsFinalizeMapper(entity)).toEqual({
            uniq_id: 'FIN-001',
            comment: 'Commentaire finalisation',
        });
    });
});
