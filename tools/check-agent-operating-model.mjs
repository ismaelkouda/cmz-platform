#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

import { validateJsonSchema } from './generator-platform/validate-ir.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const AGENT_MODEL_FILES = Object.freeze({
    agents: 'AGENTS.md',
    claude: 'CLAUDE.md',
    authority: 'PROJECT_AUTHORITY.md',
    readme: 'README.md',
    model: 'docs/agents/operating-model.md',
    userGuide: 'docs/agents/guide-utilisateur.md',
    agentsIndex: 'docs/agents/README.md',
    contract: 'conventions/agents/operating-model.json',
    contractSchema: 'conventions/agents/operating-model.schema.json',
    adr95: 'docs/adr/0095-modele-operatoire-agents-bornes.md',
    adr96: 'docs/adr/0096-separer-execution-et-revue-agent.md',
    reviewChain: 'docs/architecture/chaine-agent-execution-revue-2026-10-08.md',
    steward: '.agents/skills/cmz-steward/SKILL.md',
    stewardUi: '.agents/skills/cmz-steward/agents/openai.yaml',
    executor: '.agents/skills/cmz-step-executor/SKILL.md',
    executorUi: '.agents/skills/cmz-step-executor/agents/openai.yaml',
    specialist: '.agents/skills/cmz-task-specialist/SKILL.md',
    specialistUi: '.agents/skills/cmz-task-specialist/agents/openai.yaml',
    orchestrator: '.agents/skills/cmz-orchestrator/SKILL.md',
    orchestratorUi: '.agents/skills/cmz-orchestrator/agents/openai.yaml',
    claudeSteward: '.claude/skills/cmz-steward/SKILL.md',
    claudeExecutor: '.claude/skills/cmz-step-executor/SKILL.md',
    claudeSpecialist: '.claude/skills/cmz-task-specialist/SKILL.md',
    claudeOrchestrator: '.claude/skills/cmz-orchestrator/SKILL.md',
});

const ROLES = Object.freeze([
    'cmz-steward',
    'cmz-step-executor',
    'cmz-task-specialist',
    'cmz-orchestrator',
]);

const CONTRACT_ROLES = Object.freeze({
    steward: 'cmz-steward',
    'step-executor': 'cmz-step-executor',
    'task-specialist': 'cmz-task-specialist',
    orchestrator: 'cmz-orchestrator',
});

const CLAUDE_ADAPTER_DESCRIPTIONS = Object.freeze({
    'cmz-steward':
        'Piloter cmz-platform dans la durée depuis ses autorités courantes, son état GitHub vivant et ses preuves, sans décider seul du cap produit.',
    'cmz-step-executor':
        'Réaliser une étape cmz-platform déjà validée dans un work order immuable, avec un périmètre fermé et des preuves réfutables.',
    'cmz-task-specialist':
        'Diagnostiquer, rechercher, relire ou corriger une tâche cmz-platform précise en restant en lecture seule sauf mode fix explicitement autorisé.',
    'cmz-orchestrator':
        "Aider le propriétaire à choisir et contrôler le bon rôle cmz-platform en français simple, sans implémenter ni élargir l'autorité par défaut.",
});

const SLASH_COMMANDS = Object.freeze([
    'status',
    'plan',
    'goal',
    'review',
    'side',
    'compact',
    'fork',
]);

const HANDOFF_FIELDS = Object.freeze([
    'role',
    'objective_source',
    'branch_base_head',
    'authorized_scope',
    'changes',
    'unchanged',
    'decisions_assumptions',
    'executed_evidence',
    'unexecuted_evidence',
    'risks_limits',
    'git_review_merge_ci_state',
    'next_action_owner',
]);

function parseJsonDocument(content, label, violations) {
    try {
        return JSON.parse(content);
    } catch (error) {
        violations.push(`${label} est invalide : ${error.message}`);
        return null;
    }
}

function hasExactItems(actual, expected) {
    return (
        Array.isArray(actual) &&
        actual.length === expected.length &&
        expected.every((item) => actual.includes(item))
    );
}

function validateStructuredContract(documents, violations) {
    const contract = parseJsonDocument(
        documents.contract,
        'le contrat structuré des agents',
        violations
    );
    const schema = parseJsonDocument(
        documents.contractSchema,
        'le schéma du contrat des agents',
        violations
    );
    if (!contract || !schema) return;

    for (const violation of validateJsonSchema(contract, schema)) {
        violations.push(`contrat hors schéma : ${violation}`);
    }

    if (contract.version !== 3) {
        violations.push('le contrat structuré doit rester en version 3');
    }
    if (
        contract.authority?.automatic_instructions !== 'AGENTS.md' ||
        contract.authority?.product !== 'PROJECT_AUTHORITY.md' ||
        contract.authority?.operating_model !==
            'docs/agents/operating-model.md' ||
        contract.authority?.owner_guide !== 'docs/agents/guide-utilisateur.md'
    ) {
        violations.push(
            "le contrat structuré doit conserver les quatre sources d'autorité"
        );
    }

    const expectedRoleNames = Object.keys(CONTRACT_ROLES);
    if (!hasExactItems(Object.keys(contract.roles ?? {}), expectedRoleNames)) {
        violations.push(
            'le contrat structuré doit définir exactement les quatre rôles'
        );
    }
    for (const [roleName, skillName] of Object.entries(CONTRACT_ROLES)) {
        const role = contract.roles?.[roleName];
        if (role?.skill !== skillName) {
            violations.push(
                `le rôle ${roleName} doit rester lié à la skill ${skillName}`
            );
        }
        if (role?.may_decide_product_direction !== false) {
            violations.push(
                `le rôle ${roleName} ne doit pas décider seul du cap produit`
            );
        }
    }

    if (
        contract.rules?.one_active_role !== true ||
        contract.rules?.self_promotion_allowed !== false ||
        contract.rules?.technical_skill_expands_authority !== false ||
        contract.rules?.independent_review_required !== true
    ) {
        violations.push(
            'le contrat doit conserver rôle unique, non-promotion, autorité bornée et review indépendante'
        );
    }
    if (contract.rules?.max_identical_failures_without_new_hypothesis !== 2) {
        violations.push(
            'le contrat doit interdire une troisième tentative identique sans nouvelle hypothèse'
        );
    }

    const discovery = contract.skill_discovery;
    if (
        discovery?.canonical_root !== '.agents/skills' ||
        discovery?.clients?.codex?.root !== '.agents/skills' ||
        discovery?.clients?.codex?.invocation !== 'dollar-mention' ||
        discovery?.clients?.codex?.adapter !== 'canonical' ||
        discovery?.clients?.['claude-code']?.root !== '.claude/skills' ||
        discovery?.clients?.['claude-code']?.invocation !== 'slash-skill' ||
        discovery?.clients?.['claude-code']?.adapter !== 'import-wrapper'
    ) {
        violations.push(
            'la découverte des skills doit conserver une autorité canonique et les adaptateurs Codex/Claude Code bornés'
        );
    }
    if (
        contract.roles?.steward?.default_access !==
            'read-only-until-live-baseline' ||
        contract.roles?.['step-executor']?.mutation_boundary !==
            'approved-work-order' ||
        contract.roles?.['step-executor']?.requires_work_order !== true ||
        contract.roles?.orchestrator?.default_access !== 'read-only' ||
        contract.roles?.orchestrator?.mutation_boundary !== 'none' ||
        contract.roles?.orchestrator?.may_implement_by_default !== false
    ) {
        violations.push(
            "les frontières de mutation du steward, de l'executor ou de l'orchestrator ont dérivé"
        );
    }

    const chain = contract.execution_review_chain;
    if (
        chain?.enforcement !== 'normative-manual' ||
        chain?.executor_role !== 'step-executor' ||
        chain?.reviewer_role !== 'task-specialist' ||
        chain?.reviewer_mode !== 'review' ||
        chain?.same_agent_allowed !== false ||
        chain?.same_session_allowed !== false
    ) {
        violations.push(
            "la chaîne doit séparer l'executor du reviewer dans deux sessions"
        );
    }
    if (
        chain?.work_order_authority !== 'preapproved-and-immutable' ||
        chain?.candidate_content_is_instruction !== false ||
        chain?.executor_handoff_is_proof !== false
    ) {
        violations.push(
            'la chaîne doit conserver un work order préapprouvé et traiter le candidat comme non fiable'
        );
    }
    if (
        chain?.primary_github_trigger !== 'review_requested' ||
        chain?.compatibility_github_trigger !== 'assigned' ||
        chain?.review_after_readiness !== true ||
        chain?.new_head_invalidates_review !== true
    ) {
        violations.push(
            'la chaîne GitHub doit revoir seulement après readiness et invalider chaque ancien SHA'
        );
    }
    if (
        chain?.reviewer_may_modify !== false ||
        chain?.reviewer_may_approve !== false ||
        chain?.reviewer_may_merge !== false
    ) {
        violations.push(
            'le reviewer agent doit rester read-only sans pouvoir approuver ni fusionner'
        );
    }
    if (
        chain?.requested_human_reviewer !== 'soumailakouda' ||
        chain?.approval_policy !==
            'write-authorized-human-other-than-last-pusher' ||
        chain?.merge_actor !== 'soumailakouda'
    ) {
        violations.push(
            "la chaîne doit conserver l'approbation humaine indépendante et la fusion par Soumaila"
        );
    }
    if (chain?.external_code_egress_requires_owner_approval !== true) {
        violations.push(
            'toute sortie de code vers un modèle externe exige une autorisation du propriétaire'
        );
    }

    const specialist = contract.roles?.['task-specialist'];
    if (
        specialist?.default_access !== 'read-only' ||
        specialist?.modes?.diagnose !== false ||
        specialist?.modes?.review !== false ||
        specialist?.modes?.research !== false ||
        specialist?.modes?.fix !== true
    ) {
        violations.push(
            'le spécialiste doit rester read-only sauf en mode fix explicite'
        );
    }
    if (!hasExactItems(contract.slash_commands, SLASH_COMMANDS)) {
        violations.push(
            'le contrat doit conserver la liste fermée des commandes slash documentées'
        );
    }
    if (!hasExactItems(contract.handoff_required_fields, HANDOFF_FIELDS)) {
        violations.push(
            'le contrat doit conserver les douze champs obligatoires du handoff'
        );
    }
    if (
        schema.$schema !== 'https://json-schema.org/draft/2020-12/schema' ||
        schema.additionalProperties !== false ||
        schema.properties?.roles?.additionalProperties !== false
    ) {
        violations.push(
            'le schéma du contrat doit rester fermé et basé sur JSON Schema 2020-12'
        );
    }
}

function parseSkillFrontmatter(content, name, violations) {
    const match = content.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
    if (!match) {
        violations.push(`la skill ${name} doit avoir un frontmatter YAML`);
        return null;
    }

    try {
        return parse(match[1]);
    } catch (error) {
        violations.push(
            `le frontmatter de ${name} est invalide : ${error.message}`
        );
        return null;
    }
}

function getSkillBody(content) {
    const match = content.match(/^---\n[\s\S]*?\n---(?:\n|$)/);
    return match ? content.slice(match[0].length).trim() : null;
}

function parseSkillUi(content, name, violations) {
    try {
        return parse(content);
    } catch (error) {
        violations.push(
            `le manifest agents/openai.yaml de ${name} est invalide : ${error.message}`
        );
        return null;
    }
}

/**
 * @param {Record<keyof typeof AGENT_MODEL_FILES, string>} documents
 * @returns {string[]}
 */
export function collectAgentModelViolations(documents) {
    const violations = [];
    const normalize = (value) => value.replace(/\s+/g, ' ').trim();
    const requireText = (key, value, reason) => {
        if (!normalize(documents[key]).includes(normalize(value))) {
            violations.push(reason);
        }
    };

    validateStructuredContract(documents, violations);

    requireText(
        'agents',
        'PROJECT_AUTHORITY.md',
        'AGENTS.md doit imposer la lecture de PROJECT_AUTHORITY.md'
    );
    requireText(
        'claude',
        '@AGENTS.md',
        'CLAUDE.md doit importer les instructions automatiques canoniques'
    );
    requireText(
        'claude',
        '@PROJECT_AUTHORITY.md',
        'CLAUDE.md doit importer le cap produit courant'
    );
    requireText(
        'claude',
        '.claude/skills/',
        'CLAUDE.md doit router vers les adaptateurs de skills Claude Code'
    );
    if (
        /golden reference|ADR-0029|\[?LLM_CONTEXT\.md/i.test(documents.claude)
    ) {
        violations.push(
            'CLAUDE.md ne doit pas réintroduire une autorité historique comme cap courant'
        );
    }
    requireText(
        'agents',
        'Un agent ne',
        "AGENTS.md doit interdire l'auto-promotion de rôle"
    );
    requireText(
        'agents',
        'Après deux occurrences identiques',
        'AGENTS.md doit conserver la règle anti-relance aveugle'
    );
    requireText(
        'authority',
        'docs/agents/operating-model.md',
        "PROJECT_AUTHORITY.md doit router vers le modèle d'agents"
    );
    requireText(
        'readme',
        'AGENTS.md',
        "README.md doit annoncer le point d'entrée automatique des agents"
    );
    requireText(
        'agentsIndex',
        'guide-utilisateur.md',
        "l'index agents doit exposer le guide du propriétaire"
    );
    requireText(
        'adr95',
        '**Statut :** Accepted',
        'ADR-0095 doit rester la décision acceptée du modèle opératoire'
    );
    requireText(
        'adr95',
        'ne prouve pas',
        'ADR-0095 doit conserver la limite de la preuve automatisée'
    );
    requireText(
        'adr96',
        '**Statut :** Accepted',
        'ADR-0096 doit rester la décision acceptée de séparation entre exécution et revue'
    );
    requireText(
        'adr96',
        "n'active aucun appel de modèle externe",
        "ADR-0096 doit conserver la frontière d'activation externe"
    );
    requireText(
        'reviewChain',
        "Le reviewer agent et l'executor doivent être deux identités",
        "la chaîne détaillée doit imposer l'indépendance de l'executor et du reviewer"
    );
    requireText(
        'reviewChain',
        'Soumaila — fusion',
        'la chaîne détaillée doit conserver la fusion humaine par Soumaila'
    );

    for (const role of ROLES) {
        requireText(
            'agents',
            `$${role}`,
            `AGENTS.md doit router vers $${role}`
        );
        requireText(
            'model',
            `\`${role.replace('cmz-', '')}\``,
            `le modèle opératoire doit définir ${role}`
        );
        requireText(
            'userGuide',
            `$${role}`,
            `le guide utilisateur doit expliquer $${role}`
        );
    }

    for (const command of [
        '/status',
        '/plan',
        '/goal',
        '/review',
        '/side',
        '/compact',
        '/fork',
    ]) {
        requireText(
            'userGuide',
            command,
            `le guide utilisateur doit expliquer ${command}`
        );
    }

    requireText(
        'model',
        'Un agent a exactement un rôle actif',
        'le modèle doit imposer un rôle actif unique'
    );
    requireText(
        'model',
        'Le mode par défaut est en lecture seule',
        'le spécialiste doit rester en lecture seule par défaut'
    );
    requireText(
        'model',
        'Rôle :',
        'le modèle doit conserver le handoff standard'
    );
    requireText(
        'model',
        "un fichier n'a qu'un agent écrivain à la fois",
        "le modèle doit conserver l'ownership exclusif des fichiers"
    );
    requireText(
        'userGuide',
        "Signaux d'alerte faciles à reconnaître",
        "le guide du propriétaire doit conserver les signaux d'alerte"
    );
    requireText(
        'userGuide',
        'Contrôler la fin sans lire tout le code',
        'le guide doit permettre un contrôle non technique du handoff'
    );
    requireText(
        'model',
        "Chaîne d'une étape planifiée",
        'le modèle doit relier explicitement executor et reviewer indépendant'
    );
    requireText(
        'userGuide',
        'Faire réaliser puis relire une étape',
        'le guide doit expliquer simplement la chaîne exécution/revue'
    );

    const skillChecks = [
        ['steward', 'stewardUi', 'claudeSteward', 'cmz-steward'],
        ['executor', 'executorUi', 'claudeExecutor', 'cmz-step-executor'],
        [
            'specialist',
            'specialistUi',
            'claudeSpecialist',
            'cmz-task-specialist',
        ],
        [
            'orchestrator',
            'orchestratorUi',
            'claudeOrchestrator',
            'cmz-orchestrator',
        ],
    ];
    for (const [skillKey, uiKey, claudeKey, name] of skillChecks) {
        const frontmatter = parseSkillFrontmatter(
            documents[skillKey],
            name,
            violations
        );
        if (frontmatter?.name !== name) {
            violations.push(
                `la skill ${name} doit conserver son nom découvrable`
            );
        }
        if (
            typeof frontmatter?.description !== 'string' ||
            frontmatter.description.trim().length < 40
        ) {
            violations.push(
                `la skill ${name} doit conserver une description de routage précise`
            );
        }
        for (const authority of [
            'AGENTS.md',
            'PROJECT_AUTHORITY.md',
            'docs/agents/operating-model.md',
            'conventions/agents/operating-model.json',
        ]) {
            requireText(
                skillKey,
                authority,
                `la skill ${name} doit lire ${authority}`
            );
        }
        const ui = parseSkillUi(documents[uiKey], name, violations);
        if (!ui?.interface?.default_prompt?.includes(`$${name}`)) {
            violations.push(
                `le prompt UI de ${name} doit invoquer explicitement la skill`
            );
        }
        if (ui?.policy?.allow_implicit_invocation !== true) {
            violations.push(
                `la politique de découverte de ${name} doit rester explicite`
            );
        }

        const claudeFrontmatter = parseSkillFrontmatter(
            documents[claudeKey],
            `${name} (Claude Code)`,
            violations
        );
        if (claudeFrontmatter?.name !== name) {
            violations.push(
                `l'adaptateur Claude Code de ${name} doit conserver le nom canonique`
            );
        }
        if (
            typeof claudeFrontmatter?.description !== 'string' ||
            claudeFrontmatter.description.trim().length < 40
        ) {
            violations.push(
                `l'adaptateur Claude Code de ${name} doit rester découvrable`
            );
        }
        if (
            claudeFrontmatter &&
            !hasExactItems(Object.keys(claudeFrontmatter), [
                'name',
                'description',
            ])
        ) {
            violations.push(
                `l'adaptateur Claude Code de ${name} doit fermer son frontmatter à name et description`
            );
        }
        if (
            normalize(claudeFrontmatter?.description ?? '') !==
            normalize(CLAUDE_ADAPTER_DESCRIPTIONS[name])
        ) {
            violations.push(
                `l'adaptateur Claude Code de ${name} doit conserver sa description approuvée`
            );
        }
        const canonicalImport = `@../../../.agents/skills/${name}/SKILL.md`;
        requireText(
            claudeKey,
            canonicalImport,
            `l'adaptateur Claude Code de ${name} doit importer la skill canonique`
        );
        if (getSkillBody(documents[claudeKey]) !== canonicalImport) {
            violations.push(
                `l'adaptateur Claude Code de ${name} doit contenir uniquement l'import canonique après son frontmatter`
            );
        }
    }

    requireText(
        'steward',
        'Reste en lecture seule',
        'un nouveau steward doit commencer en lecture seule'
    );
    requireText(
        'executor',
        "Contrat d'entrée obligatoire",
        "le step executor doit exiger un contrat d'entrée"
    );
    requireText(
        'executor',
        'Ta propre commande `/review` est une prélecture, pas la revue indépendante',
        "l'executor ne doit pas confondre auto-review et revue indépendante"
    );
    requireText(
        'specialist',
        "Une demande de vérification n'est pas une autorisation de mutation",
        'la skill spécialiste doit séparer vérification et mutation'
    );
    requireText(
        'specialist',
        "ne modifie, ne pousse, n'approuve et ne fusionne rien",
        'le reviewer agent doit rester read-only sans autorité GitHub'
    );
    requireText(
        'orchestrator',
        'Ne code pas, ne pousse pas et ne fusionne pas par défaut',
        "l'orchestrator doit rester non mutateur par défaut"
    );

    const canonicalSkillDocs = [
        documents.agents,
        documents.model,
        documents.steward,
        documents.executor,
        documents.specialist,
        documents.orchestrator,
    ].join('\n');
    if (
        /\/(?:cmz-steward|cmz-step-executor|cmz-task-specialist|cmz-orchestrator)\b/.test(
            canonicalSkillDocs
        )
    ) {
        violations.push(
            'les autorités canoniques utilisent les noms de rôle, pas la syntaxe propre à un client'
        );
    }

    requireText(
        'userGuide',
        'Dans Claude Code',
        'le guide utilisateur doit distinguer la découverte des rôles dans Claude Code'
    );

    return violations;
}

export function readAgentModelDocuments(root = ROOT) {
    return Object.fromEntries(
        Object.entries(AGENT_MODEL_FILES).map(([key, path]) => [
            key,
            readFileSync(join(root, path), 'utf8'),
        ])
    );
}

function main() {
    const violations = collectAgentModelViolations(readAgentModelDocuments());
    if (violations.length > 0) {
        console.error('FAIL  modèle opératoire des agents incohérent');
        for (const violation of violations) console.error(`  - ${violation}`);
        process.exitCode = 1;
        return;
    }

    console.log(
        'OK  agents — contrat structuré, manifests et routage documentaire valides (comportement non prouvé)'
    );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
