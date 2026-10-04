import { expect, type Locator, type Page } from '@playwright/test';

export interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

export function requireBox(box: Box | null, label: string): Box {
    if (!box) throw new Error(`Géométrie introuvable : ${label}`);
    return box;
}

export function expectInsideViewport(
    box: Box,
    viewport: { width: number; height: number }
): void {
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.y).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
}

export function expectCentered(
    box: Box,
    viewport: { width: number; height: number }
): void {
    expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(
        2
    );
    expect(Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThan(
        2
    );
}

export async function formColumnCount(dialog: Locator): Promise<number> {
    return dialog.locator('.create-fields').evaluate((element) => {
        const columns = getComputedStyle(element).gridTemplateColumns.trim();
        return columns ? columns.split(/\s+/).length : 0;
    });
}

export async function waitForResponsiveLayout(
    page: Page,
    quietWindowMs = 250
): Promise<void> {
    await page.evaluate(
        () =>
            new Promise<void>((resolve) => {
                requestAnimationFrame(() =>
                    requestAnimationFrame(() => resolve())
                );
            })
    );
    await page.waitForTimeout(quietWindowMs);
}

export function observeApiRequests(page: Page): string[] {
    const requests: string[] = [];
    page.on('request', (request) => {
        const url = new URL(request.url());
        if (url.pathname.startsWith('/api/')) {
            requests.push(`${request.method()} ${url.pathname}${url.search}`);
        }
    });
    return requests;
}
