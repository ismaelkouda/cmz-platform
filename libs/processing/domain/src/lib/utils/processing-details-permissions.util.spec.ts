import { describe, expect, it } from 'vitest';
import { ProcessingDetailsProcessingState } from '../enums/processing-details-processing-state.enum';
import { ProcessingDetailsProps } from '../props/processing-details.props';
import {
    processingDetailsPermissionsTake,
    processingDetailsPermissionsTreat,
} from './processing-details-permissions.util';

function makeProps(
    overrides: Partial<Pick<ProcessingDetailsProps, 'processingState'>>
): ProcessingDetailsProps {
    return {
        processingState: null,
        ...overrides,
    } as ProcessingDetailsProps;
}

describe('processingDetailsPermissionsTake', () => {
    it('autorise take si processingState pending et permission', () => {
        expect(
            processingDetailsPermissionsTake(
                makeProps({
                    processingState: ProcessingDetailsProcessingState.PENDING,
                }),
                true
            )
        ).toBe(true);
    });

    it('refuse take sans permission ou hors pending', () => {
        expect(
            processingDetailsPermissionsTake(
                makeProps({
                    processingState: ProcessingDetailsProcessingState.PENDING,
                }),
                false
            )
        ).toBe(false);
        expect(
            processingDetailsPermissionsTake(
                makeProps({
                    processingState:
                        ProcessingDetailsProcessingState.IN_PROGRESS,
                }),
                true
            )
        ).toBe(false);
    });
});

describe('processingDetailsPermissionsTreat', () => {
    it('autorise treat en in-progress avec permission', () => {
        expect(
            processingDetailsPermissionsTreat(
                makeProps({
                    processingState:
                        ProcessingDetailsProcessingState.IN_PROGRESS,
                }),
                true
            )
        ).toBe(true);
    });

    it('refuse treat si terminated ou sans permission', () => {
        expect(
            processingDetailsPermissionsTreat(
                makeProps({
                    processingState:
                        ProcessingDetailsProcessingState.TERMINATED,
                }),
                true
            )
        ).toBe(false);
        expect(
            processingDetailsPermissionsTreat(
                makeProps({
                    processingState:
                        ProcessingDetailsProcessingState.IN_PROGRESS,
                }),
                false
            )
        ).toBe(false);
    });
});
