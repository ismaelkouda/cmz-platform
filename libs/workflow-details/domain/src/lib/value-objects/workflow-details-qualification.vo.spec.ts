import { describe, expect, it } from 'vitest';
import { workflowDetailsQualificationVo } from './workflow-details-qualification.vo';

const MODULE_PREFIX = 'TEST_MODULE';

describe('workflowDetailsQualificationVo', () => {
    it('accepte une décision approuvée sans motif ni commentaire', () => {
        const result = workflowDetailsQualificationVo(
            {
                decision: 'accepted',
                comment: '',
                reason: '',
                approvalType: 'view',
                callbackType: null,
            },
            MODULE_PREFIX
        );

        expect(result).toEqual({
            decision: 'accepted',
            comment: '',
            reason: '',
            approvalType: 'view',
            callbackType: null,
        });
    });

    it('normalise approvalType vide vers view', () => {
        const result = workflowDetailsQualificationVo(
            {
                decision: 'accepted',
                comment: 'OK',
                reason: '',
                approvalType: '  ',
                callbackType: null,
            },
            MODULE_PREFIX
        );

        expect(result.approvalType).toBe('view');
    });

    it('exige motif et commentaire pour un rejet — clé préfixée par module', () => {
        expect(() =>
            workflowDetailsQualificationVo(
                {
                    decision: 'rejected',
                    comment: '',
                    reason: 'DUP',
                    approvalType: 'view',
                    callbackType: null,
                },
                'REPORT_STATES'
            )
        ).toThrow('REPORT_STATES.DETAILS.QUALIFICATION.COMMENT_REQUIRED');

        expect(() =>
            workflowDetailsQualificationVo(
                {
                    decision: 'rejected',
                    comment: 'Hors périmètre',
                    reason: '',
                    approvalType: 'view',
                    callbackType: null,
                },
                'REQUESTS'
            )
        ).toThrow('REQUESTS.DETAILS.QUALIFICATION.REASON_REQUIRED');
    });

    it('trim les champs texte sur rejet', () => {
        const result = workflowDetailsQualificationVo(
            {
                decision: 'rejected',
                comment: '  Commentaire  ',
                reason: '  DUP  ',
                approvalType: 'view',
                callbackType: null,
            },
            MODULE_PREFIX
        );

        expect(result.comment).toBe('Commentaire');
        expect(result.reason).toBe('DUP');
    });

    it('exige callbackType si approvalType callback sur accept', () => {
        expect(() =>
            workflowDetailsQualificationVo(
                {
                    decision: 'accepted',
                    comment: 'OK',
                    reason: '',
                    approvalType: 'callback',
                    callbackType: null,
                },
                MODULE_PREFIX
            )
        ).toThrow('TEST_MODULE.DETAILS.QUALIFICATION.CALLBACK_TYPE_REQUIRED');
    });

    it('normalise callbackType null hors mode callback', () => {
        const result = workflowDetailsQualificationVo(
            {
                decision: 'accepted',
                comment: 'OK',
                reason: '',
                approvalType: 'view',
                callbackType: 'whatsapp',
            },
            MODULE_PREFIX
        );

        expect(result.callbackType).toBeNull();
    });

    it('exige editFields et commentaire en mode edit', () => {
        expect(() =>
            workflowDetailsQualificationVo(
                {
                    decision: 'accepted',
                    comment: '',
                    reason: '',
                    approvalType: 'edit',
                    callbackType: null,
                },
                MODULE_PREFIX
            )
        ).toThrow('TEST_MODULE.DETAILS.QUALIFICATION.COMMENT_REQUIRED');

        expect(() =>
            workflowDetailsQualificationVo(
                {
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
                },
                MODULE_PREFIX
            )
        ).not.toThrow();
    });

    it('normalise editFields en mode callback', () => {
        const result = workflowDetailsQualificationVo(
            {
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
            },
            MODULE_PREFIX
        );

        expect(result.callbackType).toBe('whatsapp');
        expect(result.editFields?.latitude).toBe(1);
    });
});
