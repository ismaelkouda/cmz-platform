import { describe, expect, it } from 'vitest';
import { WorkflowDetailsEntity } from './workflow-details.entity';
import { WorkflowDetailsStatus } from '../enums/workflow-details-status.enum';
import { WorkflowDetailsProps } from '../props/workflow-details.props';

/**
 * T13-12 (`taches-restantes.md`) — trouvé lors de l'audit self-review
 * post-ADR-0022 (2026-08-11) : `WorkflowDetailsEntity` (getters + `with`/
 * `withPermissions`) était la classe la moins couverte du lib (28,2%
 * statements) — elle porte la moitié du volume du dossier `entities/` et
 * fait à elle seule chuter la couverture globale sous le seuil ADR-0021
 * (85% domain/kernel). Comblé ici avec une fiche représentative complète.
 */
function makeProps(
    overrides: Partial<WorkflowDetailsProps> = {}
): WorkflowDetailsProps {
    return {
        uniqId: 'REQ-001',
        reportUniqId: 'RPT-001',
        initiatorPhone: '+237600000000',
        source: 'app',
        reportType: 'ABI',
        operators: ['MTN'],
        description: 'Description',
        reportedAt: '2026-08-01T10:00:00.000Z',
        status: WorkflowDetailsStatus.PENDING,
        qualificationState: 'pending',
        placeDescription: 'Lieu',
        placePhoto: 'https://example.com/photo.jpg',
        accessPlacePhoto: 'https://example.com/access.jpg',
        media: null,
        region: 'Centre',
        department: 'Mfoundi',
        municipality: 'Yaoundé 1',
        initiator: null,
        approvedBy: null,
        rejectedBy: null,
        processedBy: null,
        finalizedBy: null,
        treater: null,
        confirmCount: 0,
        updatedAt: '2026-08-01T10:00:00.000Z',
        location: {
            coordinates: { latitude: 3.86, longitude: 11.5, what3words: '' },
            name: 'residence_place',
            description: '',
            method: 'gps',
            type: 'point',
        },
        ...overrides,
    } as unknown as WorkflowDetailsProps;
}

describe('WorkflowDetailsEntity — getters', () => {
    it('expose tous les champs simples depuis props', () => {
        const entity = new WorkflowDetailsEntity(makeProps());

        expect(entity.uniqId).toBe('REQ-001');
        expect(entity.reportUniqId).toBe('RPT-001');
        expect(entity.initiatorPhone).toBe('+237600000000');
        expect(entity.source).toBe('app');
        expect(entity.reportType).toBe('ABI');
        expect(entity.operators).toEqual(['MTN']);
        expect(entity.description).toBe('Description');
        expect(entity.reportedAt).toBe('2026-08-01T10:00:00.000Z');
        expect(entity.status).toBe(WorkflowDetailsStatus.PENDING);
        expect(entity.qualificationState).toBe('pending');
        expect(entity.placeDescription).toBe('Lieu');
        expect(entity.placePhoto).toBe('https://example.com/photo.jpg');
        expect(entity.accessPlacePhoto).toBe('https://example.com/access.jpg');
        expect(entity.media).toBeNull();
        expect(entity.region).toBe('Centre');
        expect(entity.department).toBe('Mfoundi');
        expect(entity.municipality).toBe('Yaoundé 1');
        expect(entity.initiator).toBeNull();
        expect(entity.approvedBy).toBeNull();
        expect(entity.rejectedBy).toBeNull();
        expect(entity.processedBy).toBeNull();
        expect(entity.finalizedBy).toBeNull();
        expect(entity.treater).toBeNull();
        expect(entity.confirmCount).toBe(0);
        expect(entity.location.name).toBe('residence_place');
    });

    it('délègue updateWorkflowTimestamps à workflowDetailsWorkflowTimestamps', () => {
        const entity = new WorkflowDetailsEntity(makeProps());
        expect(Array.isArray(entity.updateWorkflowTimestamps)).toBe(true);
    });

    it('délègue canTake/canQualify/canReject aux utils de permission', () => {
        const entity = new WorkflowDetailsEntity(
            makeProps({ status: WorkflowDetailsStatus.PENDING }),
            { canTake: true, canQualify: false }
        );
        expect(entity.canTake).toBe(true);
        expect(entity.canQualify).toBe(false);
        expect(entity.canReject).toBe(false);
    });

    it('délègue titleKey/submitLabelKey aux utils de label', () => {
        const entity = new WorkflowDetailsEntity(makeProps(), {
            canTake: true,
            canQualify: false,
        });
        expect(typeof entity.titleKey).toBe('string');
        expect(typeof entity.submitLabelKey).toBe('string');
        expect(entity.titleKey.length).toBeGreaterThan(0);
    });

    it('permissions par défaut (non fournies) → canTake/canQualify false à la construction', () => {
        const entity = new WorkflowDetailsEntity(
            makeProps({ status: WorkflowDetailsStatus.PENDING })
        );
        expect(entity.canTake).toBe(false);
    });
});

describe('WorkflowDetailsEntity.withPermissions', () => {
    it('retourne la même instance si les permissions sont identiques (évite un re-render inutile)', () => {
        const entity = new WorkflowDetailsEntity(makeProps(), {
            canTake: true,
            canQualify: false,
        });
        const result = entity.withPermissions({
            canTake: true,
            canQualify: false,
        });
        expect(result).toBe(entity);
    });

    it('retourne une nouvelle instance si canTake diffère', () => {
        const entity = new WorkflowDetailsEntity(makeProps(), {
            canTake: false,
            canQualify: false,
        });
        const result = entity.withPermissions({
            canTake: true,
            canQualify: false,
        });
        expect(result).not.toBe(entity);
        expect(result.canTake).toBe(true);
    });

    it('retourne une nouvelle instance si canQualify diffère', () => {
        const entity = new WorkflowDetailsEntity(makeProps(), {
            canTake: false,
            canQualify: false,
        });
        const result = entity.withPermissions({
            canTake: false,
            canQualify: true,
        });
        expect(result).not.toBe(entity);
    });
});

describe('WorkflowDetailsEntity.with', () => {
    it('retourne la même instance si updatedAt et uniqId sont identiques (fiche non modifiée)', () => {
        const props = makeProps();
        const entity = new WorkflowDetailsEntity(props);
        const result = entity.with(makeProps());
        expect(result).toBe(entity);
    });

    it('retourne une nouvelle instance si updatedAt diffère (fiche rafraîchie)', () => {
        const entity = new WorkflowDetailsEntity(makeProps());
        const nextProps = makeProps({ updatedAt: '2026-08-02T00:00:00.000Z' });
        const result = entity.with(nextProps);
        expect(result).not.toBe(entity);
        expect(result.uniqId).toBe('REQ-001');
    });

    it('conserve les permissions courantes sur la nouvelle instance', () => {
        const entity = new WorkflowDetailsEntity(
            makeProps({ status: WorkflowDetailsStatus.IN_PROGRESS }),
            { canTake: true, canQualify: true }
        );
        const nextProps = makeProps({
            status: WorkflowDetailsStatus.IN_PROGRESS,
            updatedAt: '2026-08-02T00:00:00.000Z',
        });
        const result = entity.with(nextProps);
        expect(result.canQualify).toBe(true);
    });
});
