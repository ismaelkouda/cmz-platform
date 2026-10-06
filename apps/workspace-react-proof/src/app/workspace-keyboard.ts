export type WorkspaceDirection = 'ltr' | 'rtl';

export function workspaceTabFocusTarget(
    key: string,
    currentIndex: number,
    tabCount: number,
    direction: WorkspaceDirection
): number | null {
    if (key === 'Home') return 0;
    if (key === 'End') return tabCount - 1;

    const visualStep = direction === 'rtl' ? -1 : 1;
    if (key === 'ArrowRight') {
        return (currentIndex + visualStep + tabCount) % tabCount;
    }
    if (key === 'ArrowLeft') {
        return (currentIndex - visualStep + tabCount) % tabCount;
    }

    return null;
}
