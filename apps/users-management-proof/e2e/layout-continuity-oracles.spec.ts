import { expect, test, type Page } from '@playwright/test';

import {
    COMPACT,
    EXPANDED,
    MEDIUM_CONSTRAINED,
    command,
    installLayoutBackend,
    openReadyPage,
    searchInput,
    settle,
} from './layout-binding.support';
import { expectFailureWhileLegacy } from './c5-realization-baseline.support';

// ADR-0098, RESP-02, SEARCH-03 : changer de classe d'espace ne doit rien faire
// perdre à l'utilisateur ni rien demander au backend. Rafraîchir et Filtres
// gardent le même nœud. La recherche et, en Compact, le bouton Créer sont
// déplacés dans le DOM pour que l'ordre de tabulation reste l'ordre visuel
// (LAY-05, section 14.2) ; leur focus est restitué.

interface ContinuityWindow extends Window {
    __cmzToolbarCommands?: Record<string, Element | null>;
    __cmzSearchInput?: Element | null;
}

async function searchState(page: Page): Promise<{
    value: string;
    start: number | null;
    end: number | null;
    direction: string | null;
}> {
    return searchInput(page).evaluate((input) => {
        const field = input as HTMLInputElement;
        return {
            value: field.value,
            start: field.selectionStart,
            end: field.selectionEnd,
            direction: field.selectionDirection,
        };
    });
}

async function createFollowsCards(page: Page): Promise<boolean> {
    return page.evaluate(() => {
        const list = document.querySelector('[data-cmz-id="mobile-results"]');
        const create = document.querySelector('[data-cmz-id="create-user"]');
        return (
            !!list &&
            !!create &&
            Boolean(
                list.compareDocumentPosition(create) &
                Node.DOCUMENT_POSITION_FOLLOWING
            )
        );
    });
}

async function searchFollowsCommands(page: Page): Promise<boolean> {
    return page.evaluate(() => {
        const filters = document.querySelector(
            '[data-cmz-toolbar-action="filters"]'
        );
        const input = document.querySelector(
            '[data-cmz-id="table-search"] input'
        );
        return (
            !!filters &&
            !!input &&
            Boolean(
                filters.compareDocumentPosition(input) &
                Node.DOCUMENT_POSITION_FOLLOWING
            )
        );
    });
}

test('changement de classe : la recherche garde valeur, focus et sélection sans relancer la requête', async ({
    page,
}) => {
    expectFailureWhileLegacy(
        'C5 : la recherche n’occupe pas encore la position attendue par rapport aux commandes selon la classe.'
    );
    const requests = await installLayoutBackend(page);
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);
    await searchInput(page).fill('alpha');
    await searchInput(page).evaluate((input) =>
        (input as HTMLInputElement).setSelectionRange(1, 3, 'backward')
    );
    const before = requests.length;

    for (const viewport of [COMPACT, MEDIUM_CONSTRAINED, COMPACT, EXPANDED]) {
        await page.setViewportSize(viewport);
        await settle(page);
        await expect(searchInput(page)).toHaveCount(1);
        await expect(searchInput(page)).toBeFocused();
        expect(await searchState(page)).toEqual({
            value: 'alpha',
            start: 1,
            end: 3,
            direction: 'backward',
        });
        expect(await searchFollowsCommands(page)).toBe(
            viewport.width === COMPACT.width
        );
    }
    // RESP-02 : aucun GET, pas même le préchargement de la page suivante.
    expect(requests.length).toBe(before);
});

test('Compact atteint par redimensionnement : aucun GET avant un défilement réel', async ({
    page,
}) => {
    expectFailureWhileLegacy(
        'C5 : atteindre Compact par redimensionnement déclenche encore une requête.'
    );
    const requests = await installLayoutBackend(page);
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);
    const before = requests.length;

    await page.setViewportSize(COMPACT);
    await settle(page);
    await page.waitForTimeout(400);
    expect(requests.length).toBe(before);

    await page.locator('[data-cmz-id="mobile-user-list"]').hover();
    await page.mouse.wheel(0, 600);
    await expect
        .poll(() => requests.slice(before))
        .toEqual([expect.stringMatching(/[?&]page=2(?:&|$)/)]);
});

test('Compact dès l’ouverture : la page suivante reste préchargée sans défilement', async ({
    page,
}) => {
    // ADR-0075 : le chargement anticipé n'est suspendu que par un changement
    // de classe, jamais à l'arrivée directe en Compact.
    const requests = await installLayoutBackend(page);
    await page.setViewportSize(COMPACT);
    await openReadyPage(page);
    await expect
        .poll(() => requests.some((search) => /[?&]page=2(?:&|$)/.test(search)))
        .toBe(true);
});

test('recherche non soumise : ni la pagination, ni le rafraîchissement, ni un filtre ne l’envoient', async ({
    page,
}) => {
    expectFailureWhileLegacy(
        'C5 : le raccourci de filtre Rôle n’existe pas encore.'
    );
    const requests = await installLayoutBackend(page);
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);
    await searchInput(page).fill('alpha');
    const sent = () => requests.filter((search) => /search=/.test(search));

    await page.getByRole('button', { name: 'Suivant' }).click();
    await expect.poll(() => requests.at(-1)).toMatch(/[?&]page=2(?:&|$)/);
    await command(page, 'refresh').click();
    await settle(page);
    const roleShortcut = page.locator('[data-cmz-filter-shortcut="role"]');
    await expect(roleShortcut).toBeVisible();
    await roleShortcut.selectOption({ index: 1 });
    await settle(page);
    expect(sent()).toEqual([]);

    await searchInput(page).press('Enter');
    await expect.poll(() => requests.at(-1)).toMatch(/search=alpha/);
    await expect(searchInput(page)).toHaveValue('alpha');
});

test('recherche non soumise : le chargement progressif Compact ne l’envoie pas', async ({
    page,
}) => {
    expectFailureWhileLegacy(
        'C5 : le chargement progressif Compact envoie encore une recherche non soumise.'
    );
    const requests = await installLayoutBackend(page);
    await page.setViewportSize(COMPACT);
    await openReadyPage(page);
    await searchInput(page).fill('alpha');
    const before = requests.length;

    await page.locator('[data-cmz-id="mobile-user-list"]').hover();
    await page.mouse.wheel(0, 4000);
    await expect.poll(() => requests.length).toBeGreaterThan(before);
    expect(requests.filter((search) => /search=/.test(search))).toEqual([]);
});

test('changement de classe : Rafraîchir et Filtres gardent leur nœud, Créer reste unique et suit les cartes en Compact', async ({
    page,
}) => {
    expectFailureWhileLegacy(
        'C5 : en Compact, la commande Créer ne suit pas encore les cartes.'
    );
    await installLayoutBackend(page);
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);

    await command(page, 'filters').focus();
    await page.evaluate(() => {
        (window as ContinuityWindow).__cmzToolbarCommands = Object.fromEntries(
            ['refresh', 'filters'].map((id) => [
                id,
                document.querySelector(`[data-cmz-toolbar-action="${id}"]`),
            ])
        );
    });

    for (const viewport of [COMPACT, MEDIUM_CONSTRAINED, EXPANDED]) {
        await page.setViewportSize(viewport);
        await settle(page);
        await expect(command(page, 'create')).toHaveCount(1);
        if (viewport.width === COMPACT.width) {
            expect(await createFollowsCards(page)).toBe(true);
        }
        expect(
            await page.evaluate(() =>
                ['refresh', 'filters'].every(
                    (id) =>
                        (window as ContinuityWindow).__cmzToolbarCommands?.[
                            id
                        ] ===
                        document.querySelector(
                            `[data-cmz-toolbar-action="${id}"]`
                        )
                )
            )
        ).toBe(true);
        await expect(command(page, 'filters')).toBeFocused();
    }
});

test('changement de classe : le bouton Créer garde le focus quand il change de place', async ({
    page,
}) => {
    await installLayoutBackend(page);
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);
    await command(page, 'create').focus();

    for (const viewport of [COMPACT, MEDIUM_CONSTRAINED, COMPACT, EXPANDED]) {
        await page.setViewportSize(viewport);
        await settle(page);
        await expect(command(page, 'create')).toBeFocused();
    }
});

test('composition en cours : le déplacement de la recherche attend la fin de la saisie', async ({
    page,
}) => {
    expectFailureWhileLegacy(
        'C5 : la recherche ne rejoint pas encore les commandes après la fin d’une composition.'
    );
    // Les touches mortes françaises (« ^ » puis « e ») passent par une
    // composition : déplacer le champ pendant celle-ci casserait la saisie.
    const requests = await installLayoutBackend(page);
    await page.setViewportSize(EXPANDED);
    await openReadyPage(page);
    await searchInput(page).fill('al');
    const before = requests.length;
    await searchInput(page).evaluate((input) => {
        (window as ContinuityWindow).__cmzSearchInput = input;
        input.dispatchEvent(
            new CompositionEvent('compositionstart', { bubbles: true })
        );
    });

    await page.setViewportSize(COMPACT);
    await settle(page);
    expect(
        await searchInput(page).evaluate(
            (input) => input === (window as ContinuityWindow).__cmzSearchInput
        )
    ).toBe(true);
    await expect(searchInput(page)).toBeFocused();
    expect(await searchFollowsCommands(page)).toBe(false);

    await searchInput(page).evaluate((input) => {
        const field = input as HTMLInputElement;
        field.value = 'alê';
        field.dispatchEvent(
            new InputEvent('input', { bubbles: true, isComposing: true })
        );
        field.dispatchEvent(
            new CompositionEvent('compositionend', {
                bubbles: true,
                data: 'ê',
            })
        );
    });
    await settle(page);
    expect(await searchFollowsCommands(page)).toBe(true);
    await expect(searchInput(page)).toBeFocused();
    await expect(searchInput(page)).toHaveValue('alê');
    expect(requests.length).toBe(before);
});
