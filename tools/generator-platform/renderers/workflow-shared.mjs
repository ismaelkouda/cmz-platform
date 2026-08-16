import { expandProfileValue } from './shared.mjs';

function union(values) {
    return values.map((value) => `'${value}'`).join(' | ');
}

export function assertWorkflowRendererInput(model, profile, expectedProfile) {
    if (profile.id !== expectedProfile) {
        throw new Error(
            `workflow renderer ${expectedProfile}: received ${profile.id}`
        );
    }
    for (const operation of ['take', 'qualify', 'export']) {
        if (!model.operations.some((candidate) => candidate.id === operation)) {
            throw new Error(`workflow renderer: missing ${operation}`);
        }
    }
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
    | { readonly kind: 'take'; readonly itemId: string }
    | {
          readonly kind: 'qualify';
          readonly itemId: string;
          readonly decision: 'accepted' | 'rejected';
          readonly comment: string;
          readonly reason: string;
          readonly approvalType: string;
          readonly callbackType: string | null;
          readonly editFields?: QualificationEditFields;
      }
    | { readonly kind: 'export'; readonly filter: Readonly<Record<string, unknown>> };

export type ExportOutcome = 'exported' | 'no-data' | 'failed';

export interface WorkflowResult {
    readonly context: WorkflowContext;
    readonly exportOutcome?: ExportOutcome;
}

export interface WorkflowPorts {
    call(operation: 'take' | 'approve' | 'reject', payload: unknown): Promise<void>;
    fetchRows(filter: Readonly<Record<string, unknown>>): Promise<readonly unknown[]>;
    writeFile(rows: readonly unknown[]): Promise<void>;
    refresh(resource: 'queues' | 'tasks' | 'all'): void;
    notify(level: 'success' | 'error', key: string): void;
    setBusy(operation: 'action' | 'export', busy: boolean): void;
}
`;
}

function findOperation(model, id) {
    const found = model.operations.find((candidate) => candidate.id === id);
    if (!found) throw new Error(`workflow renderer: missing ${id}`);
    return found;
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
    const take = findOperation(model, 'take');
    const qualify = findOperation(model, 'qualify');
    const exportOperation = findOperation(model, 'export');
    const accepted = qualify.branches.find(
        (branch) => branch.when === 'accepted'
    );
    const rejected = qualify.branches.find(
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
        requireRule(qualify, rule);
    }
    if (qualify.rules.length !== 3) {
        throw new Error('workflow renderer: qualify has unsupported rules');
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
    if (take.rules.length !== 0 || exportOperation.rules.length !== 5) {
        throw new Error('workflow renderer: unsupported rule composition');
    }
    requireExactSteps(take, [
        'external_call:take',
        'notify:take',
        'refresh:queues',
        'refresh:tasks',
    ]);
    requireExactSteps(qualify, [
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
        if (command.kind === 'take') return this.take(command, context);
        if (command.kind === 'qualify') return this.qualify(command, context);
        return this.exportList(command.filter, context);
    }

    private async take(
        command: Extract<WorkflowCommand, { kind: 'take' }>,
        context: WorkflowContext
    ): Promise<WorkflowResult> {
        requireValue(context.permissions.${take.permission}, 'permission.${take.permission}.denied');
        requireValue(context.status === '${take.from[0]}', 'state.take.invalid');
        this.ports.setBusy('action', true);
        try {
            await this.ports.call('take', { itemId: command.itemId });
            this.ports.notify('success', 'take.success');
            this.ports.refresh('queues');
            this.ports.refresh('tasks');
            return { context: { ...context, status: '${take.to}' } };
        } finally {
            this.ports.setBusy('action', false);
        }
    }

    private async qualify(
        command: Extract<WorkflowCommand, { kind: 'qualify' }>,
        context: WorkflowContext
    ): Promise<WorkflowResult> {
        requireValue(context.status === '${qualify.from[0]}', 'state.qualify.invalid');
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
        command: Extract<WorkflowCommand, { kind: 'qualify' }>
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

    private async exportList(
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
