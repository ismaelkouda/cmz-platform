import { Role } from '@cmz/shared-domain';

export interface ParticipantsFindOneProps {
    uniqId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: Role | null;
    /**
     * Porte l'**uniqId** de l'équipe (fidèle au mapper source :
     * `dto.team?.uniq_id ?? null`), pas le nom — c'est cette valeur qui
     * pré-remplit le `p-select` team du formulaire d'édition. Diverge
     * délibérément du champ `team` de `ParticipantsProps` (liste), qui
     * porte le nom. Les deux mappers du source font ce choix
     * différemment ; documenté ici plutôt que "corrigé" silencieusement,
     * car chaque forme sert un usage réel différent (affichage vs.
     * pré-remplissage de formulaire).
     */
    team: string | null;
    /** Pas de statut dans la réponse `find-one` source (absent du DTO). */
    updatedAt: string;
}
