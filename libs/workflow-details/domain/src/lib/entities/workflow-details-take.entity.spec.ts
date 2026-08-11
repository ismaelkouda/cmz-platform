import { describe, expect, it } from 'vitest';
import { WorkflowDetailsTakeEntity } from './workflow-details-take.entity';

/**
 * T13-12 (`taches-restantes.md`) — trouvé lors de l'audit self-review
 * post-ADR-0022 (2026-08-11) : `WorkflowDetailsTakeEntity.fromContract`
 * n'avait aucune spec ni côté `report-states` ni côté `requests` avant la
 * migration vers `@cmz/workflow-details-domain` — dette héritée, pas une
 * régression du POC. Comblé ici. `fromContract` délègue entièrement à
 * `workflowDetailsTakeVo` (déjà testée isolément dans
 * `workflow-details-take.vo.spec.ts`) : ces tests couvrent la composition
 * (l'entité construite depuis le VO), pas les règles de validation
 * elles-mêmes.
 */
const MODULE_PREFIX = 'TEST_MODULE';

describe('WorkflowDetailsTakeEntity.fromContract', () => {
    it('construit une entité avec le uniqId normalisé (trim) du contrat', () => {
        const entity = WorkflowDetailsTakeEntity.fromContract(
            { uniqId: '  REQ-042  ' },
            MODULE_PREFIX
        );

        expect(entity.uniqId).toBe('REQ-042');
    });

    it("propage le préfixe module dans le message d'erreur de la VO sous-jacente", () => {
        expect(() =>
            WorkflowDetailsTakeEntity.fromContract(
                { uniqId: '' },
                MODULE_PREFIX
            )
        ).toThrow(`${MODULE_PREFIX}.DETAILS.TAKE.UNIQ_ID_REQUIRED`);
    });

    it('uniqId absent (undefined) → même erreur, pas de crash sur .trim()', () => {
        expect(() =>
            WorkflowDetailsTakeEntity.fromContract(
                { uniqId: undefined as unknown as string },
                MODULE_PREFIX
            )
        ).toThrow(`${MODULE_PREFIX}.DETAILS.TAKE.UNIQ_ID_REQUIRED`);
    });
});
