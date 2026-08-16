import { useCallback, useState } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createWorkflowActionHook } from '../../.stack-test-runtime/reactjs/workflow-action/src/use-workflow-action';
import type {
    WorkflowContext,
    WorkflowPorts,
    WorkflowResult,
} from '../../.stack-test-runtime/reactjs/workflow-action/src/models';

const reactHooks = { useCallback, useState };
const baseContext: WorkflowContext = {
    status: 'pending',
    qualificationStatus: null,
    permissions: { take: true, qualify: true, reject: true, export: true },
    totalCount: 2,
    loading: false,
    exporting: false,
};

afterEach(cleanup);

function createPorts(overrides: Partial<WorkflowPorts> = {}) {
    return {
        call: vi.fn(async () => undefined),
        fetchRows: vi.fn(async () => [{ id: 1 }]),
        notify: vi.fn(),
        refresh: vi.fn(),
        setBusy: vi.fn(),
        writeFile: vi.fn(async () => undefined),
        ...overrides,
    };
}

describe('sortie ReactJS workflow-action', () => {
    it('exécute une transition dans un vrai hook React et publie le résultat', async () => {
        const ports = createPorts();
        const useWorkflowAction = createWorkflowActionHook(reactHooks, ports);
        const rendered = renderHook(() => useWorkflowAction());
        let output: WorkflowResult | undefined;

        await act(async () => {
            output = await rendered.result.current.execute(
                { kind: 'take', itemId: 'REQ-1' },
                baseContext
            );
        });

        expect(output?.context.status).toBe('in-progress');
        expect(rendered.result.current.state).toEqual({
            status: 'success',
            result: output,
        });
        expect(ports.call).toHaveBeenCalledExactlyOnceWith('take', {
            itemId: 'REQ-1',
        });
        expect(vi.mocked(ports.refresh).mock.calls).toEqual([
            ['queues'],
            ['tasks'],
        ]);
    });

    it('refuse une permission absente sans effet externe', async () => {
        const ports = createPorts();
        const useWorkflowAction = createWorkflowActionHook(reactHooks, ports);
        const rendered = renderHook(() => useWorkflowAction());
        let failure: unknown;

        await act(async () => {
            try {
                await rendered.result.current.execute(
                    { kind: 'take', itemId: 'REQ-2' },
                    {
                        ...baseContext,
                        permissions: {
                            ...baseContext.permissions,
                            take: false,
                        },
                    }
                );
            } catch (error: unknown) {
                failure = error;
            }
        });

        expect((failure as { code?: string })?.code).toBe(
            'permission.take.denied'
        );
        expect(rendered.result.current.state).toMatchObject({
            status: 'error',
        });
        expect(ports.call).not.toHaveBeenCalled();
        expect(ports.refresh).not.toHaveBeenCalled();
    });

    it('attend réellement la callback d’écriture avant de réussir un export', async () => {
        let releaseWrite!: () => void;
        const writeGate = new Promise<void>((resolve) => {
            releaseWrite = resolve;
        });
        const ports = createPorts({
            writeFile: vi.fn(async () => writeGate),
        });
        const useWorkflowAction = createWorkflowActionHook(reactHooks, ports);
        const rendered = renderHook(() => useWorkflowAction());
        let settled = false;
        let pending!: Promise<WorkflowResult>;

        await act(async () => {
            pending = rendered.result.current
                .execute(
                    { kind: 'export', filter: { source: 'mobile' } },
                    baseContext
                )
                .then((value: WorkflowResult) => {
                    settled = true;
                    return value;
                });
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(ports.writeFile).toHaveBeenCalledOnce();
        expect(settled).toBe(false);
        releaseWrite();
        await act(async () => {
            await pending;
        });
        expect(settled).toBe(true);
        expect(rendered.result.current.state).toMatchObject({
            status: 'success',
        });
    });
});
