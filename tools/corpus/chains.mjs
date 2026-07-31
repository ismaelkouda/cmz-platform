/**
 * Définition des chaînes corpus — famille `workflow-action` v0.
 *
 * @see docs/architecture/patterns/workflow-action.pattern.json
 * @see docs/architecture/corpus/README.md
 */

/** @typedef {{ id: string; description: string; subgraph?: string; volet?: string; nodes: string[]; threshold_emit?: number; threshold_close?: number }} ChainDef */

/** Nœuds IR d'un volet liste — ordre = pipeline de production */
export const LIST_VOLET_NODES = [
    'list-item-props',
    'list-item-entity',
    'filter-props',
    'filter-entity',
    'filter-contract',
    'filter-vo',
    'repository-port',
    'item-api-dto',
    'filter-api-dto',
    'item-mapper',
    'filter-mapper',
    'api-source',
    'repository-impl',
    'use-case',
    'facade',
    'page-component',
    'presenter',
    'filter-store',
    'table-constants',
    'volet-providers-legacy',
    'query-bus-legacy',
    'query-handler-legacy',
    'query-legacy',
    'query-mapper-legacy',
];

const MODULE_SHELL_NODES = [
    'module-routes-legacy',
    'module-routes-nx',
    'module-endpoints',
    'module-providers-nx',
    'module-providers-legacy',
];

/** Nœuds IR sous-graphe `details` — fiche + take/treat (processing référence) */
export const DETAILS_NODES = [
    'details-props',
    'details-entity',
    'details-filter-entity',
    'details-filter-contract',
    'details-filter-vo',
    'details-take-entity',
    'details-treat-entity',
    'details-take-vo',
    'details-treat-vo',
    'details-repository-port',
    'details-api-dto',
    'details-filter-api-dto',
    'details-take-api-dto',
    'details-treat-api-dto',
    'details-mapper',
    'details-filter-mapper',
    'details-take-mapper',
    'details-treat-mapper',
    'details-api-source',
    'details-repository-impl',
    'details-use-case',
    'details-facade',
    'details-permissions-legacy',
    'details-providers-legacy',
    'details-query-bus-legacy',
    'details-query-handler-legacy',
    'details-query-legacy',
    'details-query-mapper-legacy',
    'details-take-command-bus-legacy',
    'details-take-command-handler-legacy',
    'details-take-command-legacy',
    'details-take-command-mapper-legacy',
    'details-treat-command-bus-legacy',
    'details-treat-command-handler-legacy',
    'details-treat-command-legacy',
    'details-treat-command-mapper-legacy',
];

/** Nœuds IR sous-graphe `details` — finalization (take/finalize) */
export const FINALIZATION_DETAILS_NODES = [
    'details-props',
    'details-entity',
    'details-filter-entity',
    'details-filter-contract',
    'details-filter-vo',
    'details-take-entity',
    'details-finalize-entity',
    'details-take-vo',
    'details-finalize-vo',
    'details-repository-port',
    'details-api-dto',
    'details-filter-api-dto',
    'details-take-api-dto',
    'details-finalize-api-dto',
    'details-mapper',
    'details-filter-mapper',
    'details-take-mapper',
    'details-finalize-mapper',
    'details-api-source',
    'details-repository-impl',
    'details-use-case',
    'details-facade',
    'details-dialog-ui',
    'details-permissions-legacy',
    'details-providers-legacy',
    'details-query-bus-legacy',
    'details-query-handler-legacy',
    'details-query-legacy',
    'details-query-mapper-legacy',
    'details-take-command-bus-legacy',
    'details-take-command-handler-legacy',
    'details-take-command-legacy',
    'details-take-command-mapper-legacy',
    'details-finalize-command-bus-legacy',
    'details-finalize-command-handler-legacy',
    'details-finalize-command-legacy',
    'details-finalize-command-mapper-legacy',
];

/** Nœuds IR sous-graphe `details` — requests (take/approve/reject) */
export const REQUESTS_DETAILS_NODES = [
    'details-props',
    'details-entity',
    'details-filter-entity',
    'details-filter-contract',
    'details-filter-vo',
    'details-take-entity',
    'details-approve-entity',
    'details-reject-entity',
    'details-qualification-vo',
    'details-take-vo',
    'details-permissions-util',
    'details-label-util',
    'details-repository-port',
    'details-api-dto',
    'details-filter-api-dto',
    'details-take-api-dto',
    'details-approve-api-dto',
    'details-reject-api-dto',
    'details-mapper',
    'details-filter-mapper',
    'details-take-mapper',
    'details-approve-mapper',
    'details-reject-mapper',
    'details-api-source',
    'details-repository-impl',
    'details-use-case',
    'details-facade',
    'details-dialog-component',
    'details-qualification-form',
    'details-info-panel',
    'details-photos-panel',
    'details-location-panel',
    'details-edit-fields',
    'details-providers-legacy',
    'details-query-bus-legacy',
    'details-query-handler-legacy',
    'details-query-legacy',
    'details-query-mapper-legacy',
    'details-take-command-bus-legacy',
    'details-take-command-handler-legacy',
    'details-take-command-legacy',
    'details-take-command-mapper-legacy',
    'details-approve-command-bus-legacy',
    'details-approve-command-handler-legacy',
    'details-approve-command-legacy',
    'details-approve-command-mapper-legacy',
    'details-reject-command-bus-legacy',
    'details-reject-command-handler-legacy',
    'details-reject-command-legacy',
    'details-reject-command-mapper-legacy',
];

/** Nœuds IR sous-graphe `tasks/actions` — CRUD actions de traitement */
export const TASKS_ACTIONS_NODES = [
    'tasks-actions-props',
    'tasks-actions-entity',
    'tasks-actions-contract',
    'tasks-actions-vo',
    'tasks-actions-validator',
    'tasks-actions-conformity-enum',
    'tasks-actions-repository-port',
    'tasks-actions-api-dto',
    'tasks-actions-item-mapper',
    'tasks-actions-filter-mapper',
    'tasks-actions-mutation-mapper',
    'tasks-actions-conformity-mapper',
    'tasks-actions-store-mapper',
    'tasks-actions-api-source',
    'tasks-actions-repository-impl',
    'tasks-actions-use-case',
    'tasks-actions-use-case-spec',
    'tasks-actions-facade',
    'tasks-actions-page-component',
    'tasks-actions-form-dialog',
    'tasks-actions-presenter',
    'tasks-actions-table-constants',
    'tasks-actions-type-entity',
    'tasks-actions-type-repository-port',
    'tasks-actions-type-use-case',
    'tasks-actions-type-facade',
    'tasks-actions-query-legacy',
    'tasks-actions-create-command-legacy',
    'tasks-actions-update-command-legacy',
    'tasks-actions-delete-command-legacy',
    'tasks-actions-providers-legacy',
];

/** Export Excel listes — capacité métier distincte de la pagination UI */
export const LIST_EXPORT_NODES = [
    'list-export-legacy-ui',
    'list-export-endpoints',
    'list-export-api-source',
    'list-export-repository-port',
    'list-export-repository-impl',
    'list-export-use-case',
    'list-export-use-case-spec',
    'list-export-facade',
    'list-export-ui-util',
    'list-export-shared-port',
    'list-export-shared-adapter',
    'list-export-table-util',
];

/** Permissions RBAC + edge cases — requests (take / qualify / reject / export) */
export const DETAILS_PERMISSIONS_NODES = [
    'details-permissions-approve-legacy',
    'details-permissions-reject-legacy',
    'details-permissions-manage-legacy',
    'details-permissions-spec',
    'list-rbac-paths',
    'page-permission-take',
    'page-permission-qualify',
    'page-permission-export',
];

/** Qualification edit|callback — contract unifié + champs éditables */
export const DETAILS_QUALIFICATION_NODES = [
    'details-qualification-contract',
    'details-approve-vo-legacy',
    'details-reject-vo-legacy',
    'details-qualification-vo-spec',
    'details-approve-entity-edit',
    'details-approve-entity-spec',
    'details-approval-type-constants',
    'details-callback-type-constants',
    'details-reject-motif-constants',
    'details-callback-legacy-ui',
];

/** @param {string} module @param {string} volet @param {string} description */
function listChain(module, volet, description) {
    return {
        id: `${module}.${volet}.list`,
        description,
        subgraph: 'list_volet',
        volet,
        nodes: LIST_VOLET_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    };
}

/** @type {Record<string, ChainDef>} */
export const CHAINS = {
    'processing.queues.list': listChain(
        'processing',
        'queues',
        'Bac à pioche — signalements en attente'
    ),
    'processing.tasks.list': listChain(
        'processing',
        'tasks',
        'Mes tâches — prises en charge agent'
    ),
    'processing.all.list': listChain(
        'processing',
        'all',
        'Tous les traitements — vue consolidée'
    ),
    'processing.details': {
        id: 'processing.details',
        description:
            'Détail signalement + take/treat — audit référence requis avant extension requests',
        subgraph: 'details',
        nodes: DETAILS_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    },
    'processing.tasks.actions': {
        id: 'processing.tasks.actions',
        description: 'Actions de traitement CRUD — sous-route tasks/actions',
        subgraph: 'tasks_actions',
        nodes: TASKS_ACTIONS_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    },
    'processing.export.list': {
        id: 'processing.export.list',
        description: 'Export Excel listes — GET …/export + ExcelExportPort',
        subgraph: 'list_export',
        nodes: LIST_EXPORT_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    },
    'processing.module.shell': {
        id: 'processing.module.shell',
        description: 'Routes, endpoints, composition root',
        nodes: MODULE_SHELL_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    },
    'requests.queues.list': listChain(
        'requests',
        'queues',
        "Files d'attente — demandes à qualifier"
    ),
    'requests.tasks.list': listChain(
        'requests',
        'tasks',
        'Paniers de tâches — demandes prises en charge'
    ),
    'requests.all.list': listChain(
        'requests',
        'all',
        'Demandes qualifiées — vue consolidée'
    ),
    'requests.details': {
        id: 'requests.details',
        description:
            'Fiche demande + take/approve/reject — dialog qualification Nx',
        subgraph: 'details',
        nodes: REQUESTS_DETAILS_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    },
    'requests.module.shell': {
        id: 'requests.module.shell',
        description: 'Routes, endpoints, composition root',
        nodes: MODULE_SHELL_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    },
    'requests.export.list': {
        id: 'requests.export.list',
        description:
            'Export Excel listes — legacy page courante → Nx GET …/export + ExcelExportPort',
        subgraph: 'list_export',
        nodes: LIST_EXPORT_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    },
    'requests.details.permissions': {
        id: 'requests.details.permissions',
        description:
            'RBAC + permissions take/qualify/reject/export — edge cases domaine',
        subgraph: 'details_permissions',
        nodes: DETAILS_PERMISSIONS_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    },
    'requests.details.qualification': {
        id: 'requests.details.qualification',
        description:
            'Qualification approve/reject — approvalType edit|callback + editFields',
        subgraph: 'details_qualification',
        nodes: DETAILS_QUALIFICATION_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    },
    'finalization.queues.list': listChain(
        'finalization',
        'queues',
        "Files d'attente — finalisations à prendre"
    ),
    'finalization.tasks.list': listChain(
        'finalization',
        'tasks',
        'Paniers — finalisations en cours'
    ),
    'finalization.all.list': listChain(
        'finalization',
        'all',
        'Finalisations clôturées — vue consolidée'
    ),
    'finalization.details': {
        id: 'finalization.details',
        description: 'Fiche finalisation + take/finalize — dialog Nx',
        subgraph: 'details',
        nodes: FINALIZATION_DETAILS_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    },
    'finalization.module.shell': {
        id: 'finalization.module.shell',
        description: 'Routes, endpoints, composition root',
        nodes: MODULE_SHELL_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    },
    'finalization.export.list': {
        id: 'finalization.export.list',
        description: 'Export Excel listes — GET …/export + ExcelExportPort',
        subgraph: 'list_export',
        nodes: LIST_EXPORT_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    },
    'report-states.approve.list': listChain(
        'report-states',
        'approve',
        'Demandes recevables — signalements approuvés'
    ),
    'report-states.evaluate.list': listChain(
        'report-states',
        'evaluate',
        'Signalements évalués'
    ),
    'report-states.close.list': listChain(
        'report-states',
        'close',
        'Signalements clôturés'
    ),
    'report-states.reject.list': listChain(
        'report-states',
        'reject',
        'Demandes non recevables'
    ),
    'report-states.download.list': listChain(
        'report-states',
        'download',
        'Historique exports — centre de téléchargement'
    ),
    'report-states.details': {
        id: 'report-states.details',
        description: 'Fiche signalement + take/approve/reject — dialog Nx',
        subgraph: 'details',
        nodes: REQUESTS_DETAILS_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    },
    'report-states.export.list': {
        id: 'report-states.export.list',
        description: 'Export Excel listes — GET …/export + ExcelExportPort',
        subgraph: 'list_export',
        nodes: LIST_EXPORT_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    },
    'report-states.module.shell': {
        id: 'report-states.module.shell',
        description: 'Routes, endpoints, composition root',
        nodes: MODULE_SHELL_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    },
};

export const MODULES = {
    processing: {
        pattern: 'workflow-action',
        legacyBase: 'src/presentation/pages/processing',
        chains: Object.keys(CHAINS).filter((id) =>
            id.startsWith('processing.')
        ),
        reference_module: true,
    },
    requests: {
        pattern: 'workflow-action',
        legacyBase: 'src/presentation/pages/requests',
        chains: Object.keys(CHAINS).filter((id) => id.startsWith('requests.')),
        reference_module: false,
        promoted_from: 'processing',
    },
    finalization: {
        pattern: 'workflow-action',
        legacyBase: 'src/presentation/pages/finalization',
        chains: Object.keys(CHAINS).filter((id) =>
            id.startsWith('finalization.')
        ),
        reference_module: false,
        promoted_from: 'requests',
    },
    'report-states': {
        pattern: 'workflow-action',
        legacyBase: 'src/presentation/pages/report-states',
        chains: Object.keys(CHAINS).filter((id) =>
            id.startsWith('report-states.')
        ),
        reference_module: false,
        promoted_from: 'finalization',
    },
};
