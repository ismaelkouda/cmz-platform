const RUNBOOK = 'docs/architecture/runbook-commandes-creation.md';

const explanations = {
    'create-app': {
        schema_version: '1.0.0',
        command: 'create-app',
        summary:
            "Crée un shell Angular/PWA à partir d'un application design validé.",
        runbook: RUNBOOK,
        invocations: [
            'bun run create-app --design <design.json> --experience <id> --app <nom> --dry-run',
            'bun run create-app --design <design.json> --experience <id> --app <nom> --apply <plan_id>',
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
                id: 'plan',
                description:
                    'Rendre tous les fichiers et calculer les empreintes et le plan déterministe.',
            },
            {
                id: 'candidate',
                description:
                    'Écrire ou vérifier le candidat complet hors de apps/<app>/.',
            },
            {
                id: 'compile',
                description: 'Compiler le candidat avec Angular ngc.',
            },
            {
                id: 'publication',
                description:
                    'Publier le dossier par renommage seulement si le candidat est exact.',
            },
            {
                id: 'targeted-checks',
                description:
                    'Construire en production, lint puis revérifier tous les octets publiés.',
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
                'Relancer le même --apply : le verrou mort est récupéré et un candidat ou une sortie exacts sont revérifiés.',
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
                id: 'journal-planned',
                description:
                    'Journaliser les sources, configurations protégées et leurs empreintes.',
            },
            {
                id: 'generation',
                description:
                    'Générer le module depuis le snapshot immuable de la définition.',
            },
            {
                id: 'journal-generated',
                description:
                    'Vérifier la propriété, le plan Nx et journaliser la sortie exacte.',
            },
            {
                id: 'configuration',
                description:
                    'Ajouter les attaches ESLint et TypeScript par mutations ciblées.',
            },
            {
                id: 'journal-configured',
                description:
                    'Journaliser la configuration appliquée avant les commandes externes.',
            },
            {
                id: 'gates',
                description:
                    'Installer, construire, lint, vérifier le graphe et le formatage.',
            },
            {
                id: 'completion',
                description:
                    'Revérifier les fichiers protégés puis supprimer le journal.',
            },
        ],
        checks: [
            'composition connue et consentement experimental explicite',
            'propriété et SHA-256 de la sortie générée',
            'noms, targets et dépendances déclarées',
            'Nx build de chaque projet créé',
            'Nx lint de chaque projet créé',
            'graphe Nx post-création complet',
            'Prettier sur libs/<module>',
            'bun install --frozen-lockfile final',
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
