import { camelCase, expandProfileValue } from './shared.mjs';

/**
 * Généralisation (PLAT-4bis, 2026-08-18) : ce fichier générait auparavant
 * du code TypeScript avec les noms littéraux `take`/`qualify`/`export`
 * codés en dur (types, méthodes de classe, appels de ports). Les rôles
 * structurels sont désormais détectés depuis le modèle (comme dans
 * `core/workflow-action-authoring.mjs`) et les identifiants TypeScript
 * (noms de méthode, littéraux de discrimination `kind`) sont dérivés de
 * `operation.id` réel — le vocabulaire de la définition. Les invariants
 * structurels réels (3 rôles, steps/rules attendus par rôle) restent
 * vérifiés ici, en défense en profondeur du compilateur.
 *
 * Limite explicite non levée par ce chantier : les champs de
 * qualification riches (`QualificationEditFields` — latitude/longitude/
 * placePhoto…) restent spécifiques au domaine `requests` et ne sont émis
 * que si la branche d'acceptation déclare `approvalType` avec les
 * variantes `edit`/`callback`. Un domaine qui n'utilise pas ces variantes
 * (ex. `content-moderation-workflow`) ne les déclenche jamais. Étendre le
 * schéma pour déclarer des champs de formulaire arbitraires est un
 * chantier séparé, non engagé ici (voir docs/architecture/
 * taches-restantes.md, entrée PLAT-4bis).
 * @see docs/architecture/taches-restantes.md, entrée PLAT-4bis.
 */

function union(values) {
    return values.map((value) => `'${value}'`).join(' | ');
}

function detectRole(op) {
    if (op.kind === 'export' && op.topology === 'async_callback') {
        return 'export';
    }
    if (op.kind === 'transition' && op.topology === 'sequential') {
        if (op.branches.length === 0) return 'entry';
        if (op.to === 'branch' && op.branches.length === 2) return 'decision';
    }
    return null;
}

/** @returns {{ entry: object, decision: object, exportOperation: object }} */
function resolveRoles(model) {
    const roles = new Map();
    for (const op of model.operations) {
        const role = detectRole(op);
        if (role) roles.set(role, op);
    }
    const entry = roles.get('entry');
    const decision = roles.get('decision');
    const exportOperation = roles.get('export');
    if (!entry || !decision || !exportOperation) {
        throw new Error(
            'workflow renderer: missing entry, decision or export role'
        );
    }
    return { entry, decision, exportOperation };
}

export function assertWorkflowRendererInput(model, profile, expectedProfile) {
    if (profile.id !== expectedProfile) {
        throw new Error(
            `workflow renderer ${expectedProfile}: received ${profile.id}`
        );
    }
    // Lève si un rôle structurel manque — remplace l'ancienne vérification
    // par id littéral (`take`/`qualify`/`export`).
    resolveRoles(model);
    return {
        outputRoot: expandProfileValue(
            profile.output_root,
            model,
            'output_root'
        ),
        packageName: expandProfileValue(
            profile.package_name,
            model,
            'package_name'
        ),
    };
}

export function renderWorkflowModels(model) {
    const { entry, decision, exportOperation } = resolveRoles(model);
    const permissionFields = model.permissions
        .map((permission) => `    readonly ${permission}: boolean;`)
        .join('\n');
    return `export type WorkflowStatus = ${union(model.state.statuses)};
export type QualificationStatus = ${union(model.state.qualification_statuses)};

export interface WorkflowPermissions {
${permissionFields}
}

export interface WorkflowContext {
    readonly status: WorkflowStatus;
    readonly qualificationStatus: QualificationStatus | null;
    readonly permissions: WorkflowPermissions;
    readonly totalCount: number;
    readonly loading: boolean;
    readonly exporting: boolean;
}

export interface QualificationEditFields {
    readonly latitude: number;
    readonly longitude: number;
    readonly locationName: string;
    readonly reportType: string;
    readonly operators: readonly string[];
    readonly description: string;
    readonly placeDescription: string;
    readonly placePhoto: unknown;
}

export type WorkflowCommand =
    | { readonly kind: '${entry.id}'; readonly itemId: string }
    | {
          readonly kind: '${decision.id}';
          readonly itemId: string;
          readonly decision: 'accepted' | 'rejected';
          readonly comment: string;
          readonly reason: string;
          readonly approvalType: string;
          readonly callbackType: string | null;
          readonly editFields?: QualificationEditFields;
      }
    | { readonly kind: '${exportOperation.id}'; readonly filter: Readonly<Record<string, unknown>> };

export type ExportOutcome = 'exported' | 'no-data' | 'failed';

export interface WorkflowResult {
    readonly context: WorkflowContext;
    readonly exportOutcome?: ExportOutcome;
}

export interface WorkflowPorts {
    call(operation: '${entry.id}' | 'approve' | 'reject', payload: unknown): Promise<void>;
    fetchRows(filter: Readonly<Record<string, unknown>>): Promise<readonly unknown[]>;
    writeFile(rows: readonly unknown[]): Promise<void>;
    refresh(resource: 'queues' | 'tasks' | 'all'): void;
    notify(level: 'success' | 'error', key: string): void;
    setBusy(operation: 'action' | 'export', busy: boolean): void;
}
`;
}

function requireRule(operation, rule) {
    if (!operation.rules.includes(rule)) {
        throw new Error(
            `workflow renderer: ${operation.id} missing rule ${rule}`
        );
    }
}

function requireExactSteps(operation, expected) {
    if (JSON.stringify(operation.steps) !== JSON.stringify(expected)) {
        throw new Error(
            `workflow renderer: ${operation.id} has unsupported steps`
        );
    }
}

export function renderWorkflowEngine(model) {
    const { entry, decision, exportOperation } = resolveRoles(model);
    const accepted = decision.branches.find(
        (branch) => branch.when === 'accepted'
    );
    const rejected = decision.branches.find(
        (branch) => branch.when === 'rejected'
    );
    if (
        !accepted ||
        !rejected ||
        !accepted.qualification_from ||
        !accepted.qualification_to ||
        !rejected.qualification_to
    ) {
        throw new Error(
            'workflow renderer: qualification branches are incomplete'
        );
    }
    for (const rule of [
        'rejected_requires_reason_comment',
        'callback_requires_type',
        'edit_or_callback_requires_comment_and_fields',
    ]) {
        requireRule(decision, rule);
    }
    if (decision.rules.length !== 3) {
        throw new Error('workflow renderer: decision has unsupported rules');
    }
    for (const rule of [
        'not_loading',
        'not_exporting',
        'positive_total',
        'no_rows_no_write',
        'errors_notified',
    ]) {
        requireRule(exportOperation, rule);
    }
    if (entry.rules.length !== 0 || exportOperation.rules.length !== 5) {
        throw new Error('workflow renderer: unsupported rule composition');
    }
    requireExactSteps(entry, [
        `external_call:${entry.id}`,
        `notify:${entry.id}`,
        'refresh:queues',
        'refresh:tasks',
    ]);
    requireExactSteps(decision, [
        'validate:qualification',
        'external_call:decision',
        'notify:decision',
        'refresh:tasks',
        'refresh:all',
    ]);
    requireExactSteps(exportOperation, [
        'callback:fetch-rows',
        'branch:rows',
        'await:write-file',
    ]);

    const entryMethod = camelCase(entry.id);
    const decisionMethod = camelCase(decision.id);
    // Nom de méthode dédié pour le rôle export (évite la collision
    // exportOperation.id === 'export' -> exportExport()) : suffixe
    // `List`, cohérent avec le nom historique `exportList` du cas
    // requests-workflow tout en restant dérivé de l'id réel.
    const exportMethod = camelCase(`${exportOperation.id}-list`);

    return `import type {
    QualificationEditFields,
    WorkflowCommand,
    WorkflowContext,
    WorkflowPorts,
    WorkflowResult,
} from './models';

export class WorkflowViolation extends Error {
    constructor(readonly code: string) {
        super(code);
    }
}

function requireValue(condition: boolean, code: string): void {
    if (!condition) throw new WorkflowViolation(code);
}

function validateEditFields(edit: QualificationEditFields | undefined): void {
    requireValue(!!edit, 'qualification.edit-fields.required');
    requireValue(Number.isFinite(edit?.latitude), 'qualification.latitude.required');
    requireValue(Number.isFinite(edit?.longitude), 'qualification.longitude.required');
    requireValue(!!edit?.locationName.trim(), 'qualification.location-name.required');
    requireValue(!!edit?.reportType.trim(), 'qualification.report-type.required');
    requireValue(!!edit?.operators.length, 'qualification.operators.required');
    requireValue(!!edit?.description.trim(), 'qualification.description.required');
    requireValue(!!edit?.placeDescription.trim(), 'qualification.place-description.required');
    requireValue(!!edit?.placePhoto, 'qualification.place-photo.required');
}

export class WorkflowActionEngine {
    constructor(private readonly ports: WorkflowPorts) {}

    async execute(command: WorkflowCommand, context: WorkflowContext): Promise<WorkflowResult> {
        if (command.kind === '${entry.id}') return this.${entryMethod}(command, context);
        if (command.kind === '${decision.id}') return this.${decisionMethod}(command, context);
        return this.${exportMethod}(command.filter, context);
    }

    private async ${entryMethod}(
        command: Extract<WorkflowCommand, { kind: '${entry.id}' }>,
        context: WorkflowContext
    ): Promise<WorkflowResult> {
        requireValue(context.permissions.${entry.permission}, 'permission.${entry.permission}.denied');
        requireValue(context.status === '${entry.from[0]}', 'state.${entry.id}.invalid');
        this.ports.setBusy('action', true);
        try {
            await this.ports.call('${entry.id}', { itemId: command.itemId });
            this.ports.notify('success', '${entry.id}.success');
            this.ports.refresh('queues');
            this.ports.refresh('tasks');
            return { context: { ...context, status: '${entry.to}' } };
        } finally {
            this.ports.setBusy('action', false);
        }
    }

    private async ${decisionMethod}(
        command: Extract<WorkflowCommand, { kind: '${decision.id}' }>,
        context: WorkflowContext
    ): Promise<WorkflowResult> {
        requireValue(context.status === '${decision.from[0]}', 'state.${decision.id}.invalid');
        const rejected = command.decision === 'rejected';
        requireValue(
            rejected ? context.permissions.${rejected.permission} : context.permissions.${accepted.permission},
            rejected ? 'permission.${rejected.permission}.denied' : 'permission.${accepted.permission}.denied'
        );
        if (!rejected) {
            requireValue(
                context.qualificationStatus === '${accepted.qualification_from}',
                'state.qualification.completed'
            );
        }
        this.validateQualification(command);
        this.ports.setBusy('action', true);
        try {
            const operation = rejected ? 'reject' : 'approve';
            await this.ports.call(operation, command);
            this.ports.notify('success', rejected ? 'reject.success' : 'approve.success');
            this.ports.refresh('tasks');
            this.ports.refresh('all');
            return {
                context: {
                    ...context,
                    status: rejected ? '${rejected.to}' : '${accepted.to}',
                    qualificationStatus: rejected ? '${rejected.qualification_to}' : '${accepted.qualification_to}',
                },
            };
        } finally {
            this.ports.setBusy('action', false);
        }
    }

    private validateQualification(
        command: Extract<WorkflowCommand, { kind: '${decision.id}' }>
    ): void {
        if (command.decision === 'rejected') {
            requireValue(!!command.reason.trim(), 'qualification.reason.required');
            requireValue(!!command.comment.trim(), 'qualification.comment.required');
            return;
        }
        if (command.approvalType === 'callback') {
            requireValue(!!command.callbackType?.trim(), 'qualification.callback-type.required');
        }
        if (command.approvalType === 'edit' || command.approvalType === 'callback') {
            requireValue(!!command.comment.trim(), 'qualification.comment.required');
            validateEditFields(command.editFields);
        }
    }

    private async ${exportMethod}(
        filter: Readonly<Record<string, unknown>>,
        context: WorkflowContext
    ): Promise<WorkflowResult> {
        requireValue(context.permissions.${exportOperation.permission}, 'permission.${exportOperation.permission}.denied');
        requireValue(!context.loading && !context.exporting, 'state.export.busy');
        requireValue(context.totalCount > 0, 'state.export.empty');
        this.ports.setBusy('export', true);
        try {
            const rows = await this.ports.fetchRows(filter);
            if (rows.length === 0) {
                this.ports.notify('error', 'export.no-data');
                return { context, exportOutcome: 'no-data' };
            }
            await this.ports.writeFile(rows);
            return { context, exportOutcome: 'exported' };
        } catch {
            this.ports.notify('error', 'export.error');
            return { context, exportOutcome: 'failed' };
        } finally {
            this.ports.setBusy('export', false);
        }
    }
}
`;
}

export function workflowTsconfig() {
    return `${JSON.stringify(
        {
            compilerOptions: {
                strict: true,
                target: 'ES2022',
                module: 'ESNext',
                moduleResolution: 'Bundler',
                experimentalDecorators: true,
                noEmit: true,
                skipLibCheck: true,
            },
            include: ['src/**/*.ts'],
        },
        null,
        2
    )}\n`;
}
