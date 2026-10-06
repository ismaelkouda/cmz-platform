import { describe, expect, it, vi } from 'vitest';

import {
    WorkspaceAccessStore,
    WorkspaceSessionStore,
} from './workspace-security-store';
import type { WorkspaceSession } from './workspace-security-store';

const SESSION_A: WorkspaceSession = {
    sessionKey: 'session-a',
    subjectKey: 'user-a',
};

describe('workspace security stores', () => {
    it('keeps one immutable session snapshot until its value changes', () => {
        const store = new WorkspaceSessionStore(SESSION_A);
        const listener = vi.fn();
        store.subscribe(listener);
        const first = store.getSnapshot();

        store.replace({ ...SESSION_A });

        expect(store.getSnapshot()).toBe(first);
        expect(Object.isFrozen(first)).toBe(true);
        expect(listener).not.toHaveBeenCalled();

        store.replace({ sessionKey: '', subjectKey: 'user-a' });

        expect(store.getSnapshot()).toBeNull();
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('normalizes access immutably and emits only a semantic change', () => {
        const store = new WorkspaceAccessStore(SESSION_A, [
            '/workspace/profile',
            '/workspace/profile',
            '/workspace/admin',
        ]);
        const listener = vi.fn();
        store.subscribe(listener);
        const first = store.getSnapshot();

        expect(first?.paths).toEqual([
            '/workspace/admin',
            '/workspace/profile',
        ]);
        expect(Object.isFrozen(first)).toBe(true);
        expect(Object.isFrozen(first?.paths)).toBe(true);

        store.replace(SESSION_A, ['/workspace/admin', '/workspace/profile']);

        expect(store.getSnapshot()).toBe(first);
        expect(listener).not.toHaveBeenCalled();

        store.replace({ sessionKey: 'session-b', subjectKey: 'user-a' }, [
            '/workspace/profile',
        ]);

        expect(store.getSnapshot()).not.toBe(first);
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('fails closed when access is not bound to a valid session', () => {
        const store = new WorkspaceAccessStore(null, ['/workspace/profile']);
        const listener = vi.fn();
        store.subscribe(listener);

        expect(store.getSnapshot()).toBeNull();

        store.replace({ sessionKey: ' ', subjectKey: 'user-a' }, [
            '/workspace/profile',
        ]);

        expect(store.getSnapshot()).toBeNull();
        expect(listener).not.toHaveBeenCalled();
    });
});
