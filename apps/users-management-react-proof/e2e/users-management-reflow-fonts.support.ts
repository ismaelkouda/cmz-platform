import { expect, type Locator, type Page } from '@playwright/test';
import fontPackage from '@fontsource/dejavu-sans/package.json' with { type: 'json' };
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const requireFromTest = createRequire(__filename);
const FONT_FAMILY = 'CMZ Reflow DejaVu Sans';
const EXPECTED_VERSION = '5.3.0';
const EXPECTED_SAMPLE_WIDTH = 309.36;
const SAMPLE_TEXT = 'utilisateurs';

const FONT_FILES = [
    {
        weight: 400,
        specifier:
            '@fontsource/dejavu-sans/files/dejavu-sans-latin-400-normal.woff2',
        sha256: 'c3c7ca00b4538cc10906a5d4d921aab2369b2bee781168ef2ca695f3a5805760',
    },
    {
        weight: 700,
        specifier:
            '@fontsource/dejavu-sans/files/dejavu-sans-latin-700-normal.woff2',
        sha256: '77fef6ca55dd03f7a12bc113181bda99062de681c84fd27355c6dec26cd9263c',
    },
] as const;

interface InstalledFont {
    readonly dataUrl: string;
    readonly weight: number;
}

interface ReflowFontTargets {
    readonly resetButton?: Locator;
}

function sha256(bytes: Buffer): string {
    return createHash('sha256').update(bytes).digest('hex');
}

async function loadVerifiedFonts(): Promise<readonly InstalledFont[]> {
    if (fontPackage.version !== EXPECTED_VERSION) {
        throw new Error(
            `Version DejaVu Sans inattendue : ${fontPackage.version}; attendue : ${EXPECTED_VERSION}.`
        );
    }

    return Promise.all(
        FONT_FILES.map(async ({ weight, specifier, sha256: expectedHash }) => {
            const path = requireFromTest.resolve(specifier);
            const bytes = await readFile(path);
            const actualHash = sha256(bytes);
            if (actualHash !== expectedHash) {
                throw new Error(
                    `Empreinte DejaVu Sans ${weight} invalide : ${actualHash}; attendue : ${expectedHash}.`
                );
            }
            return {
                weight,
                dataUrl: `data:font/woff2;base64,${bytes.toString('base64')}`,
            };
        })
    );
}

async function expectFamilyApplied(locator: Locator, label: string) {
    await expect(locator, `${label} doit être visible`).toBeVisible();
    const family = await locator.evaluate(
        (element) => getComputedStyle(element).fontFamily
    );
    expect(family, `${label} doit utiliser ${FONT_FAMILY}`).toContain(
        FONT_FAMILY
    );
}

export async function installDeterministicReflowFonts(
    page: Page,
    targets: ReflowFontTargets = {}
): Promise<void> {
    const fonts = await loadVerifiedFonts();
    const fontFaces = fonts
        .map(
            ({ dataUrl, weight }) => `
@font-face {
    font-family: '${FONT_FAMILY}';
    src: url('${dataUrl}') format('woff2');
    font-style: normal;
    font-weight: ${weight};
    font-display: block;
}`
        )
        .join('\n');

    await page.addStyleTag({
        content: `${fontFaces}
#root,
#root button,
#root input,
#root select,
#root textarea {
    font-family: '${FONT_FAMILY}', sans-serif !important;
}`,
    });

    const fontState = await page.evaluate(
        async ({ family, sampleText }) => {
            const weights = [400, 600, 650, 700] as const;
            const loaded = await Promise.all(
                weights.map(async (weight) => {
                    const descriptor = `${weight} 48px "${family}"`;
                    const faces = await document.fonts.load(
                        descriptor,
                        sampleText
                    );
                    return {
                        weight,
                        faceCount: faces.length,
                        ready: document.fonts.check(descriptor, sampleText),
                    };
                })
            );
            await document.fonts.ready;
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Contexte canvas 2D indisponible.');
            context.font = `600 48px "${family}"`;
            return {
                loaded,
                sampleWidth: context.measureText(sampleText).width,
            };
        },
        { family: FONT_FAMILY, sampleText: SAMPLE_TEXT }
    );

    expect(fontState.loaded).toEqual([
        { weight: 400, faceCount: 1, ready: true },
        { weight: 600, faceCount: 1, ready: true },
        { weight: 650, faceCount: 1, ready: true },
        { weight: 700, faceCount: 1, ready: true },
    ]);
    expect(fontState.sampleWidth).toBeCloseTo(EXPECTED_SAMPLE_WIDTH, 1);

    await expectFamilyApplied(
        page.locator('[data-cmz-id="page-heading"]'),
        'Le titre de page'
    );
    await expectFamilyApplied(
        page.locator('#users-search'),
        'Le champ de recherche'
    );
    if (targets.resetButton) {
        await expectFamilyApplied(
            targets.resetButton,
            'Le bouton Réinitialiser du sheet'
        );
    }
}
