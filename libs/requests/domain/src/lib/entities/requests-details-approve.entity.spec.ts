import { describe, expect, it } from 'vitest';
import { RequestsDetailsApproveEntity } from './requests-details-approve.entity';
import { RequestsDetailsEntity } from './requests-details.entity';
import { RequestsDetailsStatus } from '../enums/requests-details-status.enum';
import { RequestsDetailsProps } from '../props/requests-details.props';

function makeDetails(): RequestsDetailsEntity {
    const props = {
        uniqId: 'REQ-001',
        reportType: 'ABI',
        operators: ['MTN'],
        description: 'Description initiale',
        placeDescription: 'Lieu initial',
        placePhoto: 'https://example.com/photo.jpg',
        status: RequestsDetailsStatus.IN_PROGRESS,
        qualificationState: 'pending',
        location: {
            coordinates: { latitude: 3.86, longitude: 11.5, what3words: '' },
            name: 'residence_place',
            description: '',
            method: 'gps',
            type: 'point',
        },
        media: null,
    } as unknown as RequestsDetailsProps;

    return new RequestsDetailsEntity(props, {
        canTake: false,
        canQualify: true,
    });
}

describe('RequestsDetailsApproveEntity.fromDetails', () => {
    it('utilise les champs fiche en mode view', () => {
        const entity = RequestsDetailsApproveEntity.fromDetails(makeDetails(), {
            decision: 'accepted',
            comment: 'OK',
            reason: '',
            approvalType: 'view',
            callbackType: null,
        });

        expect(entity.latitude).toBe(3.86);
        expect(entity.reportType).toBe('ABI');
        expect(entity.operators).toEqual(['MTN']);
        expect(entity.placePhoto).toBe('https://example.com/photo.jpg');
    });

    it('applique editFields en mode edit', () => {
        const entity = RequestsDetailsApproveEntity.fromDetails(makeDetails(), {
            decision: 'accepted',
            comment: 'Modifié',
            reason: '',
            approvalType: 'edit',
            callbackType: null,
            editFields: {
                latitude: 4.05,
                longitude: 9.7,
                locationName: 'activity_place',
                reportType: 'ZOB',
                operators: ['ORANGE'],
                description: 'Nouvelle description',
                placeDescription: 'Nouveau lieu',
                placePhoto: 'https://example.com/new.jpg',
            },
        });

        expect(entity.latitude).toBe(4.05);
        expect(entity.longitude).toBe(9.7);
        expect(entity.locationName).toBe('activity_place');
        expect(entity.reportType).toBe('ZOB');
        expect(entity.operators).toEqual(['ORANGE']);
        expect(entity.description).toBe('Nouvelle description');
        expect(entity.placePhoto).toBe('https://example.com/new.jpg');
    });
});
