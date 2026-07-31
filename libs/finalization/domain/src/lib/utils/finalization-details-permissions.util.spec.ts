import { describe, expect, it } from 'vitest';
import { FinalizationDetailsFinalizationState } from '../enums/finalization-details-finalization-state.enum';
import { FinalizationDetailsProps } from '../props/finalization-details.props';
import {
    finalizationDetailsPermissionsFinalize,
    finalizationDetailsPermissionsTake,
} from './finalization-details-permissions.util';

function makeProps(
    overrides: Partial<Pick<FinalizationDetailsProps, 'finalizationState'>>
): FinalizationDetailsProps {
    return {
        finalizationState: null,
        ...overrides,
    } as FinalizationDetailsProps;
}

describe('finalizationDetailsPermissionsTake', () => {
    it('autorise take si finalizationState pending et permission', () => {
        expect(
            finalizationDetailsPermissionsTake(
                makeProps({
                    finalizationState:
                        FinalizationDetailsFinalizationState.PENDING,
                }),
                true
            )
        ).toBe(true);
    });

    it('refuse take sans permission ou hors pending', () => {
        expect(
            finalizationDetailsPermissionsTake(
                makeProps({
                    finalizationState:
                        FinalizationDetailsFinalizationState.PENDING,
                }),
                false
            )
        ).toBe(false);
        expect(
            finalizationDetailsPermissionsTake(
                makeProps({
                    finalizationState:
                        FinalizationDetailsFinalizationState.IN_PROGRESS,
                }),
                true
            )
        ).toBe(false);
    });
});

describe('finalizationDetailsPermissionsFinalize', () => {
    it('autorise finalize en in-progress avec permission', () => {
        expect(
            finalizationDetailsPermissionsFinalize(
                makeProps({
                    finalizationState:
                        FinalizationDetailsFinalizationState.IN_PROGRESS,
                }),
                true
            )
        ).toBe(true);
    });

    it('refuse finalize si completed ou sans permission', () => {
        expect(
            finalizationDetailsPermissionsFinalize(
                makeProps({
                    finalizationState:
                        FinalizationDetailsFinalizationState.COMPLETED,
                }),
                true
            )
        ).toBe(false);
        expect(
            finalizationDetailsPermissionsFinalize(
                makeProps({
                    finalizationState:
                        FinalizationDetailsFinalizationState.IN_PROGRESS,
                }),
                false
            )
        ).toBe(false);
    });
});
