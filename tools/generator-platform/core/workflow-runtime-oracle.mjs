import assert from 'node:assert/strict';

import { createEnvironmentInjector } from '@angular/core';

/**
 * Généralisation (PLAT-4bis, 2026-08-18) : cet Oracle vérifiait
 * auparavant un scénario écrit en dur pour le vocabulaire et les états
 * exacts de `requests-workflow` (`pending`/`in-progress`/`approved`/
 * `rejected`, permissions `take`/`qualify`/`reject`/`export`). Les
 * valeurs sont désormais dérivées du `model` (Behavior Model) réellement
 * testé — mêmes rôles structurels que le compilateur et le renderer
 * (`entry`/`decision`/`export`), mêmes classes de mutation vérifiées
 * (permission, garde d'état, branche de rejet, causalité asynchrone de
 * l'export), mais plus aucune valeur `requests` codée en dur ici.
 * @see docs/architecture/taches-restantes.md, entrée PLAT-4bis.
 */

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
            'workflow oracle: missing entry, decision or export role'
        );
    }
    const accepted = decision.branches.find(
        (branch) => branch.when === 'accepted'
    );
    const rejected = decision.branches.find(
        (branch) => branch.when === 'rejected'
    );
    return { entry, decision, exportOperation, accepted, rejected };
}

/** @param {ReturnType<typeof resolveRoles>} roles */
export function buildBaseContext(roles) {
    return {
        status: roles.entry.from[0],
        qualificationStatus: null,
        permissions: {
            [roles.entry.permission]: true,
            [roles.accepted.permission]: true,
            [roles.rejected.permission]: true,
            [roles.exportOperation.permission]: true,
        },
        totalCount: 2,
        loading: false,
        exporting: false,
    };
}

export const editFields = {
    latitude: 1,
    longitude: 2,
    locationName: 'Location',
    reportType: 'ABI',
    operators: ['Operator'],
    description: 'Description',
    placeDescription: 'Place',
    placePhoto: 'photo.jpg',
};

function portsFixture(options = {}) {
    const events = [];
    let releaseWrite;
    const writeGate = new Promise((resolve) => {
        releaseWrite = resolve;
    });
    return {
        events,
        releaseWrite,
        ports: {
            async call(operation) {
                events.push(`call:${operation}`);
                if (options.callError) throw new Error('call failed');
            },
            async fetchRows() {
                events.push('fetch:start');
                await Promise.resolve();
                events.push('fetch:end');
                if (options.fetchError) throw new Error('fetch failed');
                return options.rows ?? [{ id: 1 }];
            },
            async writeFile() {
                events.push('write:start');
                await writeGate;
                events.push('write:end');
            },
            refresh(resource) {
                events.push(`refresh:${resource}`);
            },
            notify(level, key) {
                events.push(`notify:${level}:${key}`);
            },
            setBusy(operation, busy) {
                events.push(`busy:${operation}:${busy}`);
            },
        },
    };
}

async function expectViolation(execute, command, context, code) {
    await assert.rejects(
        () => execute(command, context),
        (error) => error?.code === code
    );
}

export async function assertWorkflowOracle(createExecutor, model) {
    const roles = resolveRoles(model);
    const { entry, decision, exportOperation, accepted, rejected } = roles;
    const baseContext = buildBaseContext(roles);

    {
        const fixture = portsFixture();
        const execute = createExecutor(fixture.ports);
        const result = await execute(
            { kind: entry.id, itemId: 'ITEM-1' },
            baseContext
        );
        assert.equal(result.context.status, entry.to);
        assert.deepEqual(fixture.events, [
            'busy:action:true',
            `call:${entry.id}`,
            `notify:success:${entry.id}.success`,
            'refresh:queues',
            'refresh:tasks',
            'busy:action:false',
        ]);
    }
    {
        const fixture = portsFixture();
        const execute = createExecutor(fixture.ports);
        await expectViolation(
            execute,
            { kind: entry.id, itemId: 'ITEM-2' },
            { ...baseContext, status: entry.to },
            `state.${entry.id}.invalid`
        );
        await expectViolation(
            execute,
            { kind: entry.id, itemId: 'ITEM-2' },
            {
                ...baseContext,
                permissions: {
                    ...baseContext.permissions,
                    [entry.permission]: false,
                },
            },
            `permission.${entry.permission}.denied`
        );
        assert.deepEqual(fixture.events, []);
    }
    {
        const fixture = portsFixture();
        const execute = createExecutor(fixture.ports);
        const result = await execute(
            {
                kind: decision.id,
                itemId: 'ITEM-3',
                decision: 'accepted',
                comment: 'edited',
                reason: '',
                approvalType: 'callback',
                callbackType: 'sms',
                editFields,
            },
            {
                ...baseContext,
                status: decision.from[0],
                qualificationStatus: accepted.qualification_from,
            }
        );
        assert.equal(result.context.status, accepted.to);
        assert.deepEqual(fixture.events.slice(0, 6), [
            'busy:action:true',
            'call:approve',
            'notify:success:approve.success',
            'refresh:tasks',
            'refresh:all',
            'busy:action:false',
        ]);
    }
    {
        const fixture = portsFixture();
        const execute = createExecutor(fixture.ports);
        const rejectedContext = {
            ...baseContext,
            status: decision.from[0],
            qualificationStatus: 'completed',
            permissions: {
                ...baseContext.permissions,
                [decision.permission]: false,
                [rejected.permission]: true,
            },
        };
        const result = await execute(
            {
                kind: decision.id,
                itemId: 'ITEM-4',
                decision: 'rejected',
                comment: 'invalid',
                reason: 'motif',
                approvalType: 'view',
                callbackType: null,
            },
            rejectedContext
        );
        assert.equal(result.context.status, rejected.to);
        assert.ok(fixture.events.includes('call:reject'));
    }
    {
        const fixture = portsFixture();
        const execute = createExecutor(fixture.ports);
        const context = {
            ...baseContext,
            status: decision.from[0],
            qualificationStatus: accepted.qualification_from,
        };
        await expectViolation(
            execute,
            {
                kind: decision.id,
                itemId: 'ITEM-5',
                decision: 'accepted',
                comment: 'edited',
                reason: '',
                approvalType: 'callback',
                callbackType: null,
                editFields,
            },
            context,
            'qualification.callback-type.required'
        );
        await expectViolation(
            execute,
            {
                kind: decision.id,
                itemId: 'ITEM-5',
                decision: 'accepted',
                comment: '',
                reason: '',
                approvalType: 'edit',
                callbackType: null,
                editFields,
            },
            context,
            'qualification.comment.required'
        );
    }
    {
        const fixture = portsFixture();
        const execute = createExecutor(fixture.ports);
        let settled = false;
        const pending = execute(
            { kind: exportOperation.id, filter: { source: 'mobile' } },
            baseContext
        ).then((result) => {
            settled = true;
            return result;
        });
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(
            settled,
            false,
            'export must await the asynchronous file callback'
        );
        assert.deepEqual(fixture.events, [
            'busy:export:true',
            'fetch:start',
            'fetch:end',
            'write:start',
        ]);
        fixture.releaseWrite();
        const result = await pending;
        assert.equal(result.exportOutcome, 'exported');
        assert.deepEqual(fixture.events.slice(-2), [
            'write:end',
            'busy:export:false',
        ]);
    }
    {
        const fixture = portsFixture({ rows: [] });
        fixture.releaseWrite();
        const execute = createExecutor(fixture.ports);
        const result = await execute(
            { kind: exportOperation.id, filter: {} },
            baseContext
        );
        assert.equal(result.exportOutcome, 'no-data');
        assert.ok(fixture.events.includes('notify:error:export.no-data'));
        assert.ok(!fixture.events.includes('write:start'));
    }
    {
        const fixture = portsFixture({ fetchError: true });
        fixture.releaseWrite();
        const execute = createExecutor(fixture.ports);
        const result = await execute(
            { kind: exportOperation.id, filter: {} },
            baseContext
        );
        assert.equal(result.exportOutcome, 'failed');
        assert.deepEqual(fixture.events.slice(-2), [
            'notify:error:export.error',
            'busy:export:false',
        ]);
    }
}

export function angularExecutor(runtime, ports) {
    const injector = createEnvironmentInjector(
        [
            { provide: runtime.WORKFLOW_PORTS, useValue: ports },
            runtime.WorkflowActionService,
        ],
        null
    );
    const service = injector.get(runtime.WorkflowActionService);
    return (command, context) => service.execute(command, context);
}

export function reactExecutor(runtime, ports, transitions = []) {
    const hooks = {
        useState(initial) {
            return [initial, (value) => transitions.push(value)];
        },
        useCallback(callback) {
            return callback;
        },
    };
    const useWorkflow = runtime.createWorkflowActionHook(hooks, ports);
    return (command, context) => useWorkflow().execute(command, context);
}
