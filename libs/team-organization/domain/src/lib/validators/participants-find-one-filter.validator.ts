import { GenericRequiredError } from '@cmz/shared-domain';
import { ParticipantsFindOneFilterContract } from '../contracts/participants-find-one-filter.contract';
import { ParticipantsFindOneFilterValidateContract } from '../contracts/participants-find-one-filter.validate-contract';

/**
 * Le source ne valide `uniqId` qu'au compile-time (DTO typé requis, aucun
 * garde-fou à l'exécution). Normalisé ici au pattern établi partout
 * ailleurs (contrat optionnel + vérification runtime explicite).
 */
export function validateParticipantsFindOneFilter(
    contract: ParticipantsFindOneFilterContract
): asserts contract is ParticipantsFindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'TEAM_ORGANIZATION.PARTICIPANTS.FORM.ERROR.FIND_ONE.UNIQ_ID_REQUIRE'
        );
    }
}
