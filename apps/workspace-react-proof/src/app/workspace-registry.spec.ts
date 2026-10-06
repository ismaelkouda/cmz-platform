import { describe, expect, it, vi } from 'vitest';

import {
    DASHBOARD_PATH,
    PROFILE_PATH,
    WorkspaceRegistry,
} from './workspace-registry';

describe('WorkspaceRegistry dirty lifecycle', () => {
    it('publishes immutable dirty state only when its value changes', () => {
        const registry = new WorkspaceRegistry(PROFILE_PATH, PROFILE_PATH);
        const listener = vi.fn();
        registry.subscribe(listener);

        registry.setDirty(PROFILE_PATH, true);
        const dirtySnapshot = registry.getSnapshot();
        registry.setDirty(PROFILE_PATH, true);

        expect(dirtySnapshot.dirtyPaths).toEqual([PROFILE_PATH]);
        expect(Object.isFrozen(dirtySnapshot)).toBe(true);
        expect(Object.isFrozen(dirtySnapshot.dirtyPaths)).toBe(true);
        expect(registry.getSnapshot()).toBe(dirtySnapshot);
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('keeps a dirty view intact until close is explicitly confirmed', () => {
        const registry = new WorkspaceRegistry(PROFILE_PATH, PROFILE_PATH);
        registry.setDirty(PROFILE_PATH, true);

        expect(registry.requestClose(PROFILE_PATH)).toBe(
            'confirmation-required'
        );
        expect(registry.getSnapshot().paths).toContain(PROFILE_PATH);

        registry.cancelClose();
        expect(registry.getSnapshot().pendingClosePath).toBeNull();
        expect(registry.getSnapshot().dirtyPaths).toContain(PROFILE_PATH);

        registry.requestClose(PROFILE_PATH);
        expect(registry.confirmClose()).toBe(PROFILE_PATH);
        expect(registry.getSnapshot()).toEqual({
            paths: [DASHBOARD_PATH],
            dirtyPaths: [],
            pendingClosePath: null,
        });
    });

    it('closes a clean view immediately and never closes the pinned dashboard', () => {
        const registry = new WorkspaceRegistry(PROFILE_PATH, PROFILE_PATH);

        expect(registry.requestClose(DASHBOARD_PATH)).toBe('ignored');
        expect(registry.requestClose(PROFILE_PATH)).toBe('closed');
        expect(registry.getSnapshot().paths).toEqual([DASHBOARD_PATH]);
    });

    it('lets security revocation destroy a dirty view and pending confirmation', () => {
        const registry = new WorkspaceRegistry(PROFILE_PATH, PROFILE_PATH);
        registry.setDirty(PROFILE_PATH, true);
        registry.requestClose(PROFILE_PATH);

        expect(registry.revoke([PROFILE_PATH])).toEqual([PROFILE_PATH]);
        expect(registry.getSnapshot()).toEqual({
            paths: [DASHBOARD_PATH],
            dirtyPaths: [],
            pendingClosePath: null,
        });
    });
});
