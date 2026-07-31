import { describe, expect, it } from 'vitest';
import {
    RequestsDetailsApproveEntity,
    RequestsDetailsRejectEntity,
    RequestsDetailsTakeEntity,
} from '@cmz/requests-domain';
import { requestsDetailsApproveMapper } from './requests-details-approve.mapper';
import { requestsDetailsFilterMapper } from './requests-details-filter.mapper';
import { requestsDetailsRejectMapper } from './requests-details-reject.mapper';
import { requestsDetailsTakeMapper } from './requests-details-take.mapper';

describe('requestsDetailsFilterMapper', () => {
    it('mappe uniqId vers uniq_id', () => {
        expect(requestsDetailsFilterMapper({ uniqId: 'REQ-001' })).toEqual({
            uniq_id: 'REQ-001',
        });
    });
});

describe('requestsDetailsTakeMapper', () => {
    it('mappe uniqId vers uniq_id', () => {
        const entity = new RequestsDetailsTakeEntity('REQ-001');

        expect(requestsDetailsTakeMapper(entity)).toEqual({
            uniq_id: 'REQ-001',
        });
    });
});

describe('requestsDetailsApproveMapper', () => {
    it('mappe tous les champs approve vers le wire snake_case', () => {
        const entity = new RequestsDetailsApproveEntity(
            'REQ-001',
            'Commentaire',
            'view',
            null,
            3.86,
            11.5,
            'Yaoundé',
            'ABI',
            ['MTN'],
            'Description',
            'accepted',
            'Lieu',
            null,
            'photo.jpg'
        );

        expect(requestsDetailsApproveMapper(entity)).toEqual({
            uniq_id: 'REQ-001',
            comment: 'Commentaire',
            approval_type: 'view',
            callback_type: null,
            lat: '3.86',
            long: '11.5',
            location_name: 'Yaoundé',
            report_type: 'ABI',
            operators: ['MTN'],
            description: 'Description',
            decision: 'accepted',
            place_description: 'Lieu',
            reason: null,
            place_photo: 'photo.jpg',
        });
    });
});

describe('requestsDetailsRejectMapper', () => {
    it('mappe uniqId, comment, reason et callback_type', () => {
        const entity = new RequestsDetailsRejectEntity(
            'REQ-001',
            'Hors périmètre',
            'DUP',
            'sms'
        );

        expect(requestsDetailsRejectMapper(entity)).toEqual({
            uniq_id: 'REQ-001',
            comment: 'Hors périmètre',
            reason: 'DUP',
            callback_type: 'sms',
        });
    });
});
