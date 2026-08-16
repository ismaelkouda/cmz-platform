import assert from 'node:assert/strict';

import { createEnvironmentInjector } from '@angular/core';

export const baseContext = {
    status: 'pending',
    qualificationStatus: null,
    permissions: { take: true, qualify: true, reject: true, export: true },
    totalCount: 2,
    loading: false,
    exporting: false,
};

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

export async function assertWorkflowOracle(createExecutor) {
    {
        const fixture = portsFixture();
        const execute = createExecutor(fixture.ports);
        const result = await execute(
            { kind: 'take', itemId: 'REQ-1' },
            baseContext
        );
        assert.equal(result.context.status, 'in-progress');
        assert.deepEqual(fixture.events, [
            'busy:action:true',
            'call:take',
            'notify:success:take.success',
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
            { kind: 'take', itemId: 'REQ-2' },
            { ...baseContext, status: 'in-progress' },
            'state.take.invalid'
        );
        await expectViolation(
            execute,
            { kind: 'take', itemId: 'REQ-2' },
            {
                ...baseContext,
                permissions: { ...baseContext.permissions, take: false },
            },
            'permission.take.denied'
        );
        assert.deepEqual(fixture.events, []);
    }
    {
        const fixture = portsFixture();
        const execute = createExecutor(fixture.ports);
        const result = await execute(
            {
                kind: 'qualify',
                itemId: 'REQ-3',
                decision: 'accepted',
                comment: 'edited',
                reason: '',
                approvalType: 'callback',
                callbackType: 'sms',
                editFields,
            },
            {
                ...baseContext,
                status: 'in-progress',
                qualificationStatus: 'pending',
            }
        );
        assert.equal(result.context.status, 'approved');
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
            status: 'in-progress',
            qualificationStatus: 'completed',
            permissions: {
                ...baseContext.permissions,
                qualify: false,
                reject: true,
            },
        };
        const result = await execute(
            {
                kind: 'qualify',
                itemId: 'REQ-4',
                decision: 'rejected',
                comment: 'invalid',
                reason: 'motif',
                approvalType: 'view',
                callbackType: null,
            },
            rejectedContext
        );
        assert.equal(result.context.status, 'rejected');
        assert.ok(fixture.events.includes('call:reject'));
    }
    {
        const fixture = portsFixture();
        const execute = createExecutor(fixture.ports);
        const context = {
            ...baseContext,
            status: 'in-progress',
            qualificationStatus: 'pending',
        };
        await expectViolation(
            execute,
            {
                kind: 'qualify',
                itemId: 'REQ-5',
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
                kind: 'qualify',
                itemId: 'REQ-5',
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
            { kind: 'export', filter: { source: 'mobile' } },
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
            { kind: 'export', filter: {} },
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
            { kind: 'export', filter: {} },
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
