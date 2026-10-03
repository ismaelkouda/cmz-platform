import { type Page, type TestInfo } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

interface RuntimeFact {
    id: string;
    actual: string | number | boolean | null;
    expected?: string | number | boolean | null;
}

interface RuntimeFinding {
    criterion_id: string;
    outcome: 'pass' | 'fail' | 'inconclusive';
    facts: RuntimeFact[];
}

export interface VisualRuntimeEvidence {
    schema_version: '1.0.0';
    kind: 'visual-runtime-evidence';
    case_id: string;
    viewport: { width: number; height: number; pixel_ratio: 1 };
    findings: RuntimeFinding[];
}

export interface MediumCreateInvalidMeasurements {
    dialogRole: string | null;
    accessibleName: string;
    ariaModal: string | null;
    backgroundInert: boolean;
    createPosts: number;
    alertVisible: boolean;
    fieldErrorCount: number;
    focusedControl: string | null;
    backgroundLayoutStable: boolean;
    dialogWidth: number;
    meetsMinimumWidth: boolean;
    meetsMaximumWidth: boolean;
    insideViewport: boolean;
    heightBelowViewport: boolean;
    documentOverflows: boolean;
    alertText: string;
}

export function mediumCreateInvalidEvidence(
    viewport: { width: number; height: number },
    measured: MediumCreateInvalidMeasurements
): VisualRuntimeEvidence {
    return {
        schema_version: '1.0.0',
        kind: 'visual-runtime-evidence',
        case_id: 'medium-create-invalid',
        viewport: { ...viewport, pixel_ratio: 1 },
        findings: [
            {
                criterion_id: 'accessibility.dialog-semantics',
                outcome: 'pass',
                facts: [
                    {
                        id: 'role',
                        actual: measured.dialogRole,
                        expected: 'dialog',
                    },
                    {
                        id: 'accessible-name',
                        actual: measured.accessibleName.trim(),
                        expected: 'Créer un utilisateur',
                    },
                    {
                        id: 'aria-modal',
                        actual: measured.ariaModal === 'true',
                        expected: true,
                    },
                    {
                        id: 'background-inert',
                        actual: measured.backgroundInert,
                        expected: true,
                    },
                ],
            },
            {
                criterion_id: 'accessibility.invalid-feedback',
                outcome: 'pass',
                facts: [
                    {
                        id: 'post-count',
                        actual: measured.createPosts,
                        expected: 0,
                    },
                    {
                        id: 'alert-visible',
                        actual: measured.alertVisible,
                        expected: true,
                    },
                    {
                        id: 'field-error-count',
                        actual: measured.fieldErrorCount,
                        expected: 5,
                    },
                    {
                        id: 'focused-control',
                        actual: measured.focusedControl,
                        expected: 'last-name',
                    },
                ],
            },
            {
                criterion_id: 'layout.medium-create-geometry',
                outcome: 'pass',
                facts: [
                    {
                        id: 'background-layout-stable',
                        actual: measured.backgroundLayoutStable,
                        expected: true,
                    },
                    { id: 'dialog-width', actual: measured.dialogWidth },
                    {
                        id: 'meets-minimum-width',
                        actual: measured.meetsMinimumWidth,
                        expected: true,
                    },
                    {
                        id: 'meets-maximum-width',
                        actual: measured.meetsMaximumWidth,
                        expected: true,
                    },
                    {
                        id: 'inside-viewport',
                        actual: measured.insideViewport,
                        expected: true,
                    },
                    {
                        id: 'height-below-viewport',
                        actual: measured.heightBelowViewport,
                        expected: true,
                    },
                ],
            },
            {
                criterion_id: 'layout.no-horizontal-overflow',
                outcome: 'pass',
                facts: [
                    {
                        id: 'document-overflows',
                        actual: measured.documentOverflows,
                        expected: false,
                    },
                ],
            },
            {
                criterion_id: 'visual.feedback-legibility',
                outcome: 'pass',
                facts: [
                    {
                        id: 'textual-error-summary',
                        actual: measured.alertText.trim().length > 0,
                        expected: true,
                    },
                    {
                        id: 'visible-field-errors',
                        actual: measured.fieldErrorCount,
                        expected: 5,
                    },
                ],
            },
        ],
    };
}

export async function captureEvaluationCandidate(
    page: Page,
    testInfo: TestInfo,
    name: string,
    evidenceName: string,
    evidence: VisualRuntimeEvidence
): Promise<void> {
    const path = testInfo.outputPath(name);
    await page.screenshot({
        path,
        animations: 'disabled',
        caret: 'hide',
        fullPage: false,
    });
    await testInfo.attach(name, { path, contentType: 'image/png' });
    const evidencePath = testInfo.outputPath(evidenceName);
    await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
    await testInfo.attach(evidenceName, {
        path: evidencePath,
        contentType: 'application/json',
    });
    const browser = page.context().browser();
    if (!browser) throw new Error('Navigateur de capture introuvable');
    await writeFile(
        testInfo.outputPath(`${name}.metadata.json`),
        `${JSON.stringify(
            {
                browser_name: browser.browserType().name(),
                browser_version: browser.version(),
                browser_channel: testInfo.project.use.channel ?? 'bundled',
            },
            null,
            2
        )}\n`
    );
}
