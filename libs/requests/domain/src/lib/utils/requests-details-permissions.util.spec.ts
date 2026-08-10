import { describe, expect, it } from 'vitest';
import { RequestsDetailsQualificationState } from '../enums/requests-details-qualification-state.enum';
import { RequestsDetailsStatus } from '../enums/requests-details-status.enum';
import { RequestsDetailsProps } from '../props/requests-details.props';
import {
    requestsDetailsPermissionsQualify,
    requestsDetailsPermissionsReject,
    requestsDetailsPermissionsRejectContext,
    requestsDetailsPermissionsTake,
} from './requests-details-permissions.util';

function makeProps(
    overrides: Partial<
        Pick<RequestsDetailsProps, 'status' | 'qualificationState'>
    >
): RequestsDetailsProps {
    return {
        status: RequestsDetailsStatus.PENDING,
        qualificationState: null,
        ...overrides,
    } as RequestsDetailsProps;
}

describe('requestsDetailsPermissionsTake', () => {
    it('autorise take si pending et permission', () => {
        expect(
            requestsDetailsPermissionsTake(
                makeProps({ status: RequestsDetailsStatus.PENDING }),
                true
            )
        ).toBe(true);
    });

    it('refuse take sans permission ou hors pending', () => {
        expect(
            requestsDetailsPermissionsTake(
                makeProps({ status: RequestsDetailsStatus.PENDING }),
                false
            )
        ).toBe(false);
        expect(
            requestsDetailsPermissionsTake(
                makeProps({ status: RequestsDetailsStatus.IN_PROGRESS }),
                true
            )
        ).toBe(false);
    });
});

describe('requestsDetailsPermissionsQualify', () => {
    it('autorise qualify en in-progress avec qualification pending', () => {
        expect(
            requestsDetailsPermissionsQualify(
                makeProps({
                    status: RequestsDetailsStatus.IN_PROGRESS,
                    qualificationState:
                        RequestsDetailsQualificationState.PENDING,
                }),
                true
            )
        ).toBe(true);
    });

    it('refuse qualify si qualification completed', () => {
        expect(
            requestsDetailsPermissionsQualify(
                makeProps({
                    status: RequestsDetailsStatus.IN_PROGRESS,
                    qualificationState:
                        RequestsDetailsQualificationState.COMPLETED,
                }),
                true
            )
        ).toBe(false);
    });
});

describe('requestsDetailsPermissionsReject', () => {
    it('autorise reject en in-progress avec permission', () => {
        expect(
            requestsDetailsPermissionsReject(
                makeProps({ status: RequestsDetailsStatus.IN_PROGRESS }),
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
            requestsDetailsPermissionsReject(
                makeProps({
                    status: RequestsDetailsStatus.IN_PROGRESS,
                    qualificationState:
                        RequestsDetailsQualificationState.COMPLETED,
                }),
                true
            )
        ).toBe(true);
    });
});

describe('requestsDetailsPermissionsRejectContext', () => {
    it('active le contexte approbation dès in-progress', () => {
        expect(
            requestsDetailsPermissionsRejectContext(
                makeProps({ status: RequestsDetailsStatus.IN_PROGRESS })
            )
        ).toBe(true);
        expect(
            requestsDetailsPermissionsRejectContext(
                makeProps({ status: RequestsDetailsStatus.PENDING })
            )
        ).toBe(false);
    });
});
