import { describe, expect, it } from 'vitest';
import {
    ReportStatesDetailsApproveEntity,
    ReportStatesDetailsRejectEntity,
    ReportStatesDetailsTakeEntity,
} from '@cmz/report-states-domain';
import { reportStatesDetailsApproveMapper } from './report-states-details-approve.mapper';
import { reportStatesDetailsFilterMapper } from './report-states-details-filter.mapper';
import { reportStatesDetailsRejectMapper } from './report-states-details-reject.mapper';
import { reportStatesDetailsTakeMapper } from './report-states-details-take.mapper';

describe('reportStatesDetailsFilterMapper', () => {
    it('mappe uniqId vers uniq_id', () => {
        expect(reportStatesDetailsFilterMapper({ uniqId: 'REQ-001' })).toEqual({
            uniq_id: 'REQ-001',
        });
    });
});

describe('reportStatesDetailsTakeMapper', () => {
    it('mappe uniqId vers uniq_id', () => {
        const entity = new ReportStatesDetailsTakeEntity('REQ-001');

        expect(reportStatesDetailsTakeMapper(entity)).toEqual({
            uniq_id: 'REQ-001',
        });
    });
});

describe('reportStatesDetailsApproveMapper', () => {
    it('mappe tous les champs approve vers le wire snake_case', () => {
        const entity = new ReportStatesDetailsApproveEntity(
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

        expect(reportStatesDetailsApproveMapper(entity)).toEqual({
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

describe('reportStatesDetailsRejectMapper', () => {
    it('mappe uniqId, comment, reason et callback_type', () => {
        const entity = new ReportStatesDetailsRejectEntity(
            'REQ-001',
            'Hors périmètre',
            'DUP',
            'sms'
        );

        expect(reportStatesDetailsRejectMapper(entity)).toEqual({
            uniq_id: 'REQ-001',
            comment: 'Hors périmètre',
            reason: 'DUP',
            callback_type: 'sms',
        });
    });
});
