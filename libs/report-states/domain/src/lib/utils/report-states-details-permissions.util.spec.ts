import { describe, expect, it } from 'vitest';
import { ReportStatesDetailsQualificationState } from '../enums/report-states-details-qualification-state.enum';
import { ReportStatesDetailsStatus } from '../enums/report-states-details-status.enum';
import { ReportStatesDetailsProps } from '../props/report-states-details.props';
import {
    reportStatesDetailsPermissionsQualify,
    reportStatesDetailsPermissionsReject,
    reportStatesDetailsPermissionsRejectContext,
    reportStatesDetailsPermissionsTake,
} from './report-states-details-permissions.util';

function makeProps(
    overrides: Partial<
        Pick<ReportStatesDetailsProps, 'status' | 'qualificationState'>
    >
): ReportStatesDetailsProps {
    return {
        status: ReportStatesDetailsStatus.PENDING,
        qualificationState: null,
        ...overrides,
    } as ReportStatesDetailsProps;
}

describe('reportStatesDetailsPermissionsTake', () => {
    it('autorise take si pending et permission', () => {
        expect(
            reportStatesDetailsPermissionsTake(
                makeProps({ status: ReportStatesDetailsStatus.PENDING }),
                true
            )
        ).toBe(true);
    });

    it('refuse take sans permission ou hors pending', () => {
        expect(
            reportStatesDetailsPermissionsTake(
                makeProps({ status: ReportStatesDetailsStatus.PENDING }),
                false
            )
        ).toBe(false);
        expect(
            reportStatesDetailsPermissionsTake(
                makeProps({ status: ReportStatesDetailsStatus.IN_PROGRESS }),
                true
            )
        ).toBe(false);
    });
});

describe('reportStatesDetailsPermissionsQualify', () => {
    it('autorise qualify en in-progress avec qualification pending', () => {
        expect(
            reportStatesDetailsPermissionsQualify(
                makeProps({
                    status: ReportStatesDetailsStatus.IN_PROGRESS,
                    qualificationState:
                        ReportStatesDetailsQualificationState.PENDING,
                }),
                true
            )
        ).toBe(true);
    });

    it('refuse qualify si qualification completed', () => {
        expect(
            reportStatesDetailsPermissionsQualify(
                makeProps({
                    status: ReportStatesDetailsStatus.IN_PROGRESS,
                    qualificationState:
                        ReportStatesDetailsQualificationState.COMPLETED,
                }),
                true
            )
        ).toBe(false);
    });
});

describe('reportStatesDetailsPermissionsReject', () => {
    it('autorise reject en in-progress avec permission', () => {
        expect(
            reportStatesDetailsPermissionsReject(
                makeProps({ status: ReportStatesDetailsStatus.IN_PROGRESS }),
                true
            )
        ).toBe(true);
    });

    // Comportement intentionnel (P1-5, backlog-llm.md) : contrairement à
    // `*PermissionsQualify` qui exige `qualificationState === PENDING`,
    // `*PermissionsReject` ne vérifie jamais `qualificationState` — le
    // rejet reste possible même après qu'une qualification ait déjà été
    // complétée. Documenté ici pour qu'une future modification ne
    // « corrige » pas ce qui ressemble à un oubli mais n'en est pas un.
    it('autorise reject en in-progress même si qualificationState est COMPLETED (comportement voulu, pas un bug)', () => {
        expect(
            reportStatesDetailsPermissionsReject(
                makeProps({
                    status: ReportStatesDetailsStatus.IN_PROGRESS,
                    qualificationState:
                        ReportStatesDetailsQualificationState.COMPLETED,
                }),
                true
            )
        ).toBe(true);
    });
});

describe('reportStatesDetailsPermissionsRejectContext', () => {
    it('active le contexte approbation dès in-progress', () => {
        expect(
            reportStatesDetailsPermissionsRejectContext(
                makeProps({ status: ReportStatesDetailsStatus.IN_PROGRESS })
            )
        ).toBe(true);
        expect(
            reportStatesDetailsPermissionsRejectContext(
                makeProps({ status: ReportStatesDetailsStatus.PENDING })
            )
        ).toBe(false);
    });
});
