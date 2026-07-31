import { describe, expect, it } from 'vitest';
import { RequestsDetailsQualificationState } from '../enums/requests-details-qualification-state.enum';
import { RequestsDetailsStatus } from '../enums/requests-details-status.enum';
import { RequestsDetailsEntity } from '../entities/requests-details.entity';
import { RequestsDetailsProps } from '../props/requests-details.props';
import {
    requestsDetailsSubmitLabel,
    requestsDetailsTitle,
} from './requests-details-label.util';

function makeEntity(
    status: RequestsDetailsStatus,
    qualificationState: RequestsDetailsQualificationState | null,
    permissions: { canTake: boolean; canQualify: boolean }
): RequestsDetailsEntity {
    const props = {
        status,
        qualificationState,
        uniqId: 'REQ-001',
        updatedAt: '2026-01-01',
    } as RequestsDetailsProps;

    return new RequestsDetailsEntity(props, permissions);
}

describe('requestsDetailsTitle', () => {
    it('retourne TAKE quand take autorisé', () => {
        const entity = makeEntity(RequestsDetailsStatus.PENDING, null, {
            canTake: true,
            canQualify: false,
        });

        expect(entity.titleKey).toBe('MANAGEMENT.STATUS.TAKE');
        expect(
            requestsDetailsTitle({
                props: {
                    status: RequestsDetailsStatus.PENDING,
                    qualificationState: null,
                } as RequestsDetailsProps,
                permissions: { canTake: true, canQualify: false },
            })
        ).toBe('MANAGEMENT.STATUS.TAKE');
    });

    it('retourne APPROBATION en contexte qualification', () => {
        const entity = makeEntity(
            RequestsDetailsStatus.IN_PROGRESS,
            RequestsDetailsQualificationState.PENDING,
            { canTake: false, canQualify: true }
        );

        expect(entity.titleKey).toBe('MANAGEMENT.STATUS.APPROBATION');
    });

    it('retourne INFORMATION en lecture seule', () => {
        const entity = makeEntity(
            RequestsDetailsStatus.APPROVED,
            RequestsDetailsQualificationState.COMPLETED,
            { canTake: false, canQualify: false }
        );

        expect(entity.titleKey).toBe('MANAGEMENT.STATUS.INFORMATION');
        expect(entity.submitLabelKey).toBe('MANAGEMENT.BUTTONS.INFORMATION');
        expect(
            requestsDetailsSubmitLabel({
                props: {
                    status: RequestsDetailsStatus.APPROVED,
                    qualificationState:
                        RequestsDetailsQualificationState.COMPLETED,
                } as RequestsDetailsProps,
                permissions: { canTake: false, canQualify: false },
            })
        ).toBe('MANAGEMENT.BUTTONS.INFORMATION');
    });
});
