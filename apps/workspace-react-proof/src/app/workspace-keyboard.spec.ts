import { describe, expect, it } from 'vitest';

import { workspaceTabFocusTarget } from './workspace-keyboard';

describe('React workspace keyboard policy', () => {
    it('moves in visual order and wraps in LTR', () => {
        expect(workspaceTabFocusTarget('ArrowRight', 1, 3, 'ltr')).toBe(2);
        expect(workspaceTabFocusTarget('ArrowRight', 2, 3, 'ltr')).toBe(0);
        expect(workspaceTabFocusTarget('ArrowLeft', 0, 3, 'ltr')).toBe(2);
    });

    it('reverses horizontal arrows in RTL', () => {
        expect(workspaceTabFocusTarget('ArrowRight', 1, 3, 'rtl')).toBe(0);
        expect(workspaceTabFocusTarget('ArrowRight', 0, 3, 'rtl')).toBe(2);
        expect(workspaceTabFocusTarget('ArrowLeft', 2, 3, 'rtl')).toBe(0);
    });

    it('supports boundaries without activating a tab', () => {
        expect(workspaceTabFocusTarget('Home', 2, 3, 'rtl')).toBe(0);
        expect(workspaceTabFocusTarget('End', 0, 3, 'ltr')).toBe(2);
        expect(workspaceTabFocusTarget('Enter', 1, 3, 'ltr')).toBeNull();
    });
});
