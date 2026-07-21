/**
 * Convention de commit du monorepo — Conventional Commits (ADR-0006).
 *
 * L'enjeu n'est pas cosmétique : `nx affected` s'appuie sur l'historique Git,
 * et un historique lisible est ce qui permet de comprendre ce qu'une plage de
 * commits a réellement changé lors d'une migration de cette ampleur.
 */
export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
        // Types autorisés, volontairement restreints pour rester lisibles.
        'type-enum': [
            2,
            'always',
            [
                'feat', // nouvelle fonctionnalité
                'fix', // correction de bogue
                'refactor', // refonte sans changement de comportement
                'perf', // amélioration de performance
                'docs', // documentation seule
                'test', // ajout ou correction de tests
                'build', // dépendances, outillage de build
                'ci', // intégration continue
                'chore', // tâches diverses sans impact produit
                'revert', // annulation d'un commit
            ],
        ],

        // La portée désigne le package ou la zone concernée : feat(backoffice-angular): …
        // Non obligatoire, car certains commits sont transverses.
        'scope-case': [2, 'always', 'kebab-case'],

        'subject-case': [
            2,
            'never',
            ['start-case', 'pascal-case', 'upper-case'],
        ],
        'subject-empty': [2, 'never'],
        'subject-full-stop': [2, 'never', '.'],

        // 72 caractères : au-delà, `git log --oneline` tronque.
        'header-max-length': [2, 'always', 72],
        'body-max-line-length': [2, 'always', 100],
    },
};
