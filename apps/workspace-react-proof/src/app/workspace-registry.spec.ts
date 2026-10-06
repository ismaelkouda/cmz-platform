import { describe, expect, it, vi } from 'vitest';

import {
    DASHBOARD_PATH,
    PROFILE_PATH,
    WorkspaceRegistry,
} from './workspace-registry';

describe('WorkspaceRegistry dirty lifecycle', () => {
    it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
        'refuses an invalid capacity (%s)',
        (capacity) => {
            expect(
                () =>
                    new WorkspaceRegistry(
                        DASHBOARD_PATH,
                        DASHBOARD_PATH,
                        capacity
                    )
            ).toThrow(RangeError);
        }
    );

    it('refuses a new view at capacity without eviction or URL mutation', () => {
        const registry = new WorkspaceRegistry(
            DASHBOARD_PATH,
            DASHBOARD_PATH,
            1
        );
        const listener = vi.fn();
        registry.subscribe(listener);

        expect(
            registry.recordVisit(
                PROFILE_PATH,
                `${PROFILE_PATH}?section=security#roles`
            )
        ).toBe('capacity-reached');
        expect(registry.getSnapshot()).toEqual({
            paths: [DASHBOARD_PATH],
            dirtyPaths: [],
            pendingClosePath: null,
        });
        expect(registry.activationUrl(PROFILE_PATH)).toBe(PROFILE_PATH);
        expect(listener).not.toHaveBeenCalled();
    });

    it('still refreshes the activation URL of an existing view at capacity', () => {
        const registry = new WorkspaceRegistry(
            DASHBOARD_PATH,
            DASHBOARD_PATH,
            1
        );
        const activationUrl = `${DASHBOARD_PATH}?period=today#summary`;

        expect(registry.recordVisit(DASHBOARD_PATH, activationUrl)).toBe(
            'already-open'
        );
        expect(registry.activationUrl(DASHBOARD_PATH)).toBe(activationUrl);
        expect(registry.getSnapshot().paths).toEqual([DASHBOARD_PATH]);
    });

    it('does not admit an initial route beyond the configured capacity', () => {
        const registry = new WorkspaceRegistry(
            PROFILE_PATH,
            `${PROFILE_PATH}?section=summary`,
            1
        );

        expect(registry.getSnapshot().paths).toEqual([DASHBOARD_PATH]);
        expect(registry.activationUrl(PROFILE_PATH)).toBe(PROFILE_PATH);
    });

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
