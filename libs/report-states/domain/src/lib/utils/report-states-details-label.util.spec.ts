import { describe, expect, it } from 'vitest';
import { ReportStatesDetailsQualificationState } from '../enums/report-states-details-qualification-state.enum';
import { ReportStatesDetailsStatus } from '../enums/report-states-details-status.enum';
import { ReportStatesDetailsEntity } from '../entities/report-states-details.entity';
import { ReportStatesDetailsProps } from '../props/report-states-details.props';
import {
    reportStatesDetailsSubmitLabel,
    reportStatesDetailsTitle,
} from './report-states-details-label.util';

function makeEntity(
    status: ReportStatesDetailsStatus,
    qualificationState: ReportStatesDetailsQualificationState | null,
    permissions: { canTake: boolean; canQualify: boolean }
): ReportStatesDetailsEntity {
    const props = {
        status,
        qualificationState,
        uniqId: 'REQ-001',
        updatedAt: '2026-01-01',
    } as ReportStatesDetailsProps;

    return new ReportStatesDetailsEntity(props, permissions);
}

describe('reportStatesDetailsTitle', () => {
    it('retourne TAKE quand take autorisé', () => {
        const entity = makeEntity(ReportStatesDetailsStatus.PENDING, null, {
            canTake: true,
            canQualify: false,
        });

        expect(entity.titleKey).toBe('MANAGEMENT.STATUS.TAKE');
        expect(
            reportStatesDetailsTitle({
                props: {
                    status: ReportStatesDetailsStatus.PENDING,
                    qualificationState: null,
                } as ReportStatesDetailsProps,
                permissions: { canTake: true, canQualify: false },
            })
        ).toBe('MANAGEMENT.STATUS.TAKE');
    });

    it('retourne APPROBATION en contexte qualification', () => {
        const entity = makeEntity(
            ReportStatesDetailsStatus.IN_PROGRESS,
            ReportStatesDetailsQualificationState.PENDING,
            { canTake: false, canQualify: true }
        );

        expect(entity.titleKey).toBe('MANAGEMENT.STATUS.APPROBATION');
    });

    it('retourne INFORMATION en lecture seule', () => {
        const entity = makeEntity(
            ReportStatesDetailsStatus.APPROVED,
            ReportStatesDetailsQualificationState.COMPLETED,
            { canTake: false, canQualify: false }
        );

        expect(entity.titleKey).toBe('MANAGEMENT.STATUS.INFORMATION');
        expect(entity.submitLabelKey).toBe('MANAGEMENT.BUTTONS.INFORMATION');
        expect(
            reportStatesDetailsSubmitLabel({
                props: {
                    status: ReportStatesDetailsStatus.APPROVED,
                    qualificationState:
                        ReportStatesDetailsQualificationState.COMPLETED,
                } as ReportStatesDetailsProps,
                permissions: { canTake: false, canQualify: false },
            })
        ).toBe('MANAGEMENT.BUTTONS.INFORMATION');
    });
});
