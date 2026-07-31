import { describe, expect, it } from 'vitest';
import { requestsDetailsQualificationVo } from './requests-details-qualification.vo';

describe('requestsDetailsQualificationVo', () => {
    it('accepte une décision approuvée sans motif ni commentaire', () => {
        const result = requestsDetailsQualificationVo({
            decision: 'accepted',
            comment: '',
            reason: '',
            approvalType: 'view',
            callbackType: null,
        });

        expect(result).toEqual({
            decision: 'accepted',
            comment: '',
            reason: '',
            approvalType: 'view',
            callbackType: null,
        });
    });

    it('normalise approvalType vide vers view', () => {
        const result = requestsDetailsQualificationVo({
            decision: 'accepted',
            comment: 'OK',
            reason: '',
            approvalType: '  ',
            callbackType: null,
        });

        expect(result.approvalType).toBe('view');
    });

    it('exige motif et commentaire pour un rejet', () => {
        expect(() =>
            requestsDetailsQualificationVo({
                decision: 'rejected',
                comment: '',
                reason: 'DUP',
                approvalType: 'view',
                callbackType: null,
            })
        ).toThrow('REQUESTS.DETAILS.QUALIFICATION.COMMENT_REQUIRED');

        expect(() =>
            requestsDetailsQualificationVo({
                decision: 'rejected',
                comment: 'Hors périmètre',
                reason: '',
                approvalType: 'view',
                callbackType: null,
            })
        ).toThrow('REQUESTS.DETAILS.QUALIFICATION.REASON_REQUIRED');
    });

    it('trim les champs texte sur rejet', () => {
        const result = requestsDetailsQualificationVo({
            decision: 'rejected',
            comment: '  Commentaire  ',
            reason: '  DUP  ',
            approvalType: 'view',
            callbackType: null,
        });

        expect(result.comment).toBe('Commentaire');
        expect(result.reason).toBe('DUP');
    });

    it('exige callbackType si approvalType callback sur accept', () => {
        expect(() =>
            requestsDetailsQualificationVo({
                decision: 'accepted',
                comment: 'OK',
                reason: '',
                approvalType: 'callback',
                callbackType: null,
            })
        ).toThrow('REQUESTS.DETAILS.QUALIFICATION.CALLBACK_TYPE_REQUIRED');
    });

    it('normalise callbackType null hors mode callback', () => {
        const result = requestsDetailsQualificationVo({
            decision: 'accepted',
            comment: 'OK',
            reason: '',
            approvalType: 'view',
            callbackType: 'whatsapp',
        });

        expect(result.callbackType).toBeNull();
    });

    it('exige editFields et commentaire en mode edit', () => {
        expect(() =>
            requestsDetailsQualificationVo({
                decision: 'accepted',
                comment: '',
                reason: '',
                approvalType: 'edit',
                callbackType: null,
            })
        ).toThrow('REQUESTS.DETAILS.QUALIFICATION.COMMENT_REQUIRED');

        expect(() =>
            requestsDetailsQualificationVo({
                decision: 'accepted',
                comment: 'OK',
                reason: '',
                approvalType: 'edit',
                callbackType: null,
                editFields: {
                    latitude: 3.86,
                    longitude: 11.5,
                    locationName: 'residence_place',
                    reportType: 'ABI',
                    operators: ['MTN'],
                    description: 'Desc',
                    placeDescription: 'Lieu',
                    placePhoto: 'photo.jpg',
                },
            })
        ).not.toThrow();
    });

    it('normalise editFields en mode callback', () => {
        const result = requestsDetailsQualificationVo({
            decision: 'accepted',
            comment: 'Rappel',
            reason: '',
            approvalType: 'callback',
            callbackType: 'whatsapp',
            editFields: {
                latitude: 1,
                longitude: 2,
                locationName: 'residence_place',
                reportType: 'ABI',
                operators: ['MTN'],
                description: 'Desc',
                placeDescription: 'Lieu',
                placePhoto: 'photo.jpg',
            },
        });

        expect(result.callbackType).toBe('whatsapp');
        expect(result.editFields?.latitude).toBe(1);
    });
});
