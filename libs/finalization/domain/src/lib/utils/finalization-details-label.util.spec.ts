import { describe, expect, it } from 'vitest';
import { FinalizationDetailsFinalizationState } from '../enums/finalization-details-finalization-state.enum';
import { FinalizationDetailsStatus } from '../enums/finalization-details-status.enum';
import { FinalizationDetailsEntity } from '../entities/finalization-details.entity';
import { FinalizationDetailsProps } from '../props/finalization-details.props';
import {
    finalizationDetailsSubmitLabel,
    finalizationDetailsTitle,
} from './finalization-details-label.util';

function makeEntity(
    finalizationState: FinalizationDetailsFinalizationState | null,
    permissions: { canTake: boolean; canFinalize: boolean }
): FinalizationDetailsEntity {
    const props = {
        status: FinalizationDetailsStatus.IN_PROGRESS,
        finalizationState,
        uniqId: 'FIN-001',
        updatedAt: '2026-01-01',
    } as FinalizationDetailsProps;

    return new FinalizationDetailsEntity(props, permissions);
}

describe('finalizationDetailsTitle', () => {
    it('retourne TAKE quand take autorisé', () => {
        const entity = makeEntity(
            FinalizationDetailsFinalizationState.PENDING,
            {
                canTake: true,
                canFinalize: false,
            }
        );

        expect(entity.titleKey).toBe('MANAGEMENT.STATUS.TAKE');
        expect(
            finalizationDetailsTitle({
                props: {
                    finalizationState:
                        FinalizationDetailsFinalizationState.PENDING,
                } as FinalizationDetailsProps,
                permissions: { canTake: true, canFinalize: false },
            })
        ).toBe('MANAGEMENT.STATUS.TAKE');
    });

    it('retourne FINALIZATION en contexte finalize', () => {
        const entity = makeEntity(
            FinalizationDetailsFinalizationState.IN_PROGRESS,
            { canTake: false, canFinalize: true }
        );

        expect(entity.titleKey).toBe('MANAGEMENT.STATUS.FINALIZATION');
    });

    it('retourne INFORMATION en lecture seule', () => {
        const entity = makeEntity(
            FinalizationDetailsFinalizationState.COMPLETED,
            { canTake: false, canFinalize: false }
        );

        expect(entity.titleKey).toBe('MANAGEMENT.STATUS.INFORMATION');
        expect(entity.submitLabelKey).toBe('MANAGEMENT.BUTTONS.INFORMATION');
        expect(
            finalizationDetailsSubmitLabel({
                props: {
                    finalizationState:
                        FinalizationDetailsFinalizationState.COMPLETED,
                } as FinalizationDetailsProps,
                permissions: { canTake: false, canFinalize: false },
            })
        ).toBe('MANAGEMENT.BUTTONS.INFORMATION');
    });
});
