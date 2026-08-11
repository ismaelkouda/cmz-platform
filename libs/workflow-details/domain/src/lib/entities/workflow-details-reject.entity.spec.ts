import { describe, expect, it } from 'vitest';
import { WorkflowDetailsRejectEntity } from './workflow-details-reject.entity';
import { WorkflowDetailsEntity } from './workflow-details.entity';
import { WorkflowDetailsStatus } from '../enums/workflow-details-status.enum';
import { WorkflowDetailsProps } from '../props/workflow-details.props';

/**
 * T13-12 (`taches-restantes.md`) — trouvé lors de l'audit self-review
 * post-ADR-0022 (2026-08-11) : `WorkflowDetailsRejectEntity.fromDetails`
 * n'avait aucune spec ni côté `report-states` ni côté `requests` avant la
 * migration vers `@cmz/workflow-details-domain` — dette héritée, pas une
 * régression du POC. Comblé ici.
 */
function makeDetails(): WorkflowDetailsEntity {
    const props = {
        uniqId: 'REQ-042',
        reportType: 'ABI',
        operators: ['MTN'],
        description: 'Description initiale',
        placeDescription: 'Lieu initial',
        placePhoto: null,
        status: WorkflowDetailsStatus.IN_PROGRESS,
        qualificationState: 'pending',
        location: {
            coordinates: { latitude: 3.86, longitude: 11.5, what3words: '' },
            name: 'residence_place',
            description: '',
            method: 'gps',
            type: 'point',
        },
        media: null,
    } as unknown as WorkflowDetailsProps;

    return new WorkflowDetailsEntity(props, {
        canTake: false,
        canQualify: true,
    });
}

describe('WorkflowDetailsRejectEntity.fromDetails', () => {
    it('dérive uniqId depuis la fiche, comment/reason/callbackType depuis la qualification', () => {
        const entity = WorkflowDetailsRejectEntity.fromDetails(makeDetails(), {
            decision: 'rejected',
            comment: 'Motif insuffisant',
            reason: 'INCOMPLETE',
            approvalType: 'view',
            callbackType: 'phone',
        });

        expect(entity.uniqId).toBe('REQ-042');
        expect(entity.comment).toBe('Motif insuffisant');
        expect(entity.reason).toBe('INCOMPLETE');
        expect(entity.callbackType).toBe('phone');
    });

    it('callbackType absent (null) → chaîne vide, jamais null propagé', () => {
        const entity = WorkflowDetailsRejectEntity.fromDetails(makeDetails(), {
            decision: 'rejected',
            comment: 'Refus',
            reason: 'OTHER',
            approvalType: 'view',
            callbackType: null,
        });

        expect(entity.callbackType).toBe('');
    });

    it("ignore les champs qualification non pertinents (approvalType, editFields) — reject n'en a pas besoin", () => {
        const entity = WorkflowDetailsRejectEntity.fromDetails(makeDetails(), {
            decision: 'rejected',
            comment: 'Refus avec edit fields fournis par erreur',
            reason: 'OTHER',
            approvalType: 'edit',
            callbackType: null,
            editFields: {
                latitude: 1,
                longitude: 1,
                locationName: 'x',
                reportType: 'x',
                operators: [],
                description: 'x',
                placeDescription: 'x',
                placePhoto: null,
            },
        });

        expect(entity.uniqId).toBe('REQ-042');
        expect(entity.comment).toBe(
            'Refus avec edit fields fournis par erreur'
        );
    });
});
