const RUNBOOK = 'docs/architecture/runbook-commandes-creation.md';

const explanations = {
    'create-app': {
        schema_version: '1.0.0',
        command: 'create-app',
        summary:
            "Crée un shell Angular/PWA à partir d'un application design validé.",
        runbook: RUNBOOK,
        invocations: [
            'bun run create-app --design <design.json> --experience <id> --app <nom>',
            'bun run create-app --design <design.json> --experience <id> --app <nom> --dry-run',
            'bun run create-app --design <design.json> --experience <id> --app <nom> --expect-plan <plan_id>',
        ],
        ownership: {
            creates: ['apps/<app>/**'],
            modifies: [],
            protects: [
                'le design source et ses contrats backend',
                'tout fichier hors de apps/<app>/',
            ],
            temporary: [
                'apps/.<app>.create-app-candidate-<plan_id>/**',
                'apps/.<app>.generation-lock/**',
            ],
        },
        phases: [
            {
                id: 'preconditions',
                description:
                    'Valider les arguments, le profil, le tombstone et le design avec ses contrats.',
            },
            {
                id: 'render',
                description:
                    'Rendre les fichiers, calculer leur plan et vérifier le plan attendu s’il est fourni.',
            },
            {
                id: 'candidate-checks',
                description:
                    'Écrire le candidat exact, compiler avec Angular ngc et refuser toute dérive.',
            },
            {
                id: 'publication',
                description:
                    'Publier atomiquement, puis exécuter build et lint ciblés avant la confirmation finale.',
            },
        ],
        checks: [
            'application-design schema + backend contracts',
            'inventaire et SHA-256 de chaque fichier',
            'Angular ngc --noEmit',
            'Nx build:production',
            'Nx lint',
        ],
        transaction: {
            journal: null,
            lock: 'apps/.<app>.generation-lock/',
            recovery:
                'Relancer la même commande directe : le verrou mort est récupéré et un candidat ou une sortie exacts sont revérifiés.',
            resume_command: null,
            abort_command: null,
        },
    },
    'add-library': {
        schema_version: '1.0.0',
        command: 'add-library',
        summary:
            'Applique à une application un adaptateur de bibliothèque déjà qualifié.',
        runbook: RUNBOOK,
        invocations: [
            'bun run add-library --app <nom> --library <id> --dry-run',
            'bun run add-library --app <nom> --library <id>',
            'bun run add-library --app <nom> --library <id> --expect-plan <library-plan:id>',
        ],
        ownership: {
            creates: ['un commit Git fast-forward sur la branche courante'],
            modifies: ['apps/<app>/**'],
            protects: [
                'package.json et bun.lock à la racine',
                'tout fichier hors de apps/<app>/',
                'la branche courante avant la publication finale',
            ],
            temporary: [
                '<os-temp>/cmz-library-apply-*/workspace/**',
                '<os-temp>/cmz-library-home-*/**',
            ],
        },
        phases: [
            {
                id: 'preconditions',
                description:
                    'Exiger un dépôt propre, une branche attachée et aucune ancienne transaction.',
            },
            {
                id: 'qualified-track',
                description:
                    'Vérifier versions, paquets, provenance, attestation et adaptateur qualifié.',
            },
            {
                id: 'candidate',
                description: 'Créer un worktree Git détaché et jetable.',
            },
            {
                id: 'adapter',
                description:
                    "Appliquer l'adaptateur plateforme dans le candidat uniquement.",
            },
            {
                id: 'install-without-scripts',
                description:
                    'Installer depuis le lockfile gelé, sans scripts de dépendances.',
            },
            {
                id: 'targeted-checks',
                description:
                    "Formater puis exécuter les targets disponibles de l'application.",
            },
            {
                id: 'plan',
                description:
                    'Calculer le change-set applicatif et le plan reproductible.',
            },
            {
                id: 'publication',
                description:
                    'Créer le commit candidat puis publier par fast-forward Git.',
            },
        ],
        checks: [
            'piste compatible unique et verified',
            'empreintes de qualification et adaptateur exactes',
            'bun install --frozen-lockfile --ignore-scripts',
            'Nx build obligatoire',
            'Nx lint si présent',
            'Nx test si présent',
            'change-set limité à apps/<app>/',
            'HEAD inchangé avant fast-forward',
        ],
        transaction: {
            journal: null,
            lock: null,
            recovery:
                'Avant le fast-forward, le workspace principal reste intact et la commande peut être relancée ; après, le commit est complet.',
            resume_command: null,
            abort_command: null,
        },
    },
    'create-module': {
        schema_version: '1.0.0',
        command: 'create-module',
        summary:
            'Génère, câble et vérifie un module Nx depuis une définition validée.',
        runbook: RUNBOOK,
        invocations: [
            'bun run create-module --definition <definition.json> [--dry-run] [--allow-experimental]',
            'bun run create-module --resume --module <nom>',
            'bun run create-module --abort --module <nom>',
        ],
        ownership: {
            creates: ['libs/<module>/**'],
            modifies: [
                'eslint.config.mjs',
                'tsconfig.base.json',
                'bun.lock si Bun doit le synchroniser',
            ],
            protects: [
                'eslint.config.mjs',
                'tsconfig.base.json',
                'knip.json',
                'package.json',
                'bun.lock',
            ],
            temporary: [
                '.cmz/create-module-transactions/<module>/**',
                '.cmz/retire-module-transactions/.lock/**',
            ],
        },
        phases: [
            {
                id: 'preconditions',
                description:
                    'Valider définition, composition, tombstone, transactions et identité Git.',
            },
            {
                id: 'journal-and-generation',
                description:
                    'Journaliser les entrées protégées, générer depuis leur snapshot et vérifier la sortie.',
            },
            {
                id: 'configuration',
                description:
                    'Ajouter les attaches ESLint et TypeScript ciblées puis journaliser leur état.',
            },
            {
                id: 'targeted-checks-and-completion',
                description:
                    'Installer sans scripts, vérifier les projets créés, revérifier les fichiers protégés et clore le journal.',
            },
        ],
        checks: [
            'composition connue et consentement experimental explicite',
            'propriété et SHA-256 de la sortie générée',
            'bun install --ignore-scripts',
            'Nx build de chaque projet créé',
            'Nx lint de chaque projet créé',
            'Prettier sur libs/<module>',
            'gates globales noms, targets et dépendances déléguées à la CI bloquante',
        ],
        transaction: {
            journal: '.cmz/create-module-transactions/<module>/state.json',
            lock: '.cmz/retire-module-transactions/.lock/',
            recovery:
                'Une erreur normale restaure automatiquement ; après interruption brutale, inspecter le journal puis reprendre ou abandonner explicitement.',
            resume_command: 'bun run create-module --resume --module <nom>',
            abort_command: 'bun run create-module --abort --module <nom>',
        },
    },
};

export const EXPLAINED_COMMANDS = Object.freeze(Object.keys(explanations));

export function commandExplanation(command) {
    if (!Object.hasOwn(explanations, command)) {
        throw new Error(`Commande non explicable : ${command}`);
    }
    return structuredClone(explanations[command]);
}

export function formatCommandExplanation(command) {
    return `${JSON.stringify(commandExplanation(command), null, 2)}\n`;
}
