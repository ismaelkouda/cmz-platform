import { expect, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPOSITORY_ROOT = resolve(__dirname, '../../..');
const BINDING_PATH = 'designs/users-management-proof.layout-binding.json';

export type LayoutClass = 'compact' | 'medium' | 'expanded';
export type ExampleState =
    | 'filters-open'
    | 'filters-closed'
    | 'search-active'
    | 'filter-summary'
    | 'filter-detail';

interface BindingCapability {
    id: string;
    status: 'declared' | 'absent';
}

interface BindingSelection {
    set_id: string;
    source_id: string;
    regions: string[];
    omitted_capabilities: string[];
}

interface LayoutBinding {
    example_sets: { set_id: string; path: string }[];
    capabilities: BindingCapability[];
    selections: BindingSelection[];
}

interface ExampleSource {
    id: string;
    path: string;
    layout_class: LayoutClass;
    space: 'comfortable' | 'constrained';
    state: ExampleState;
    viewport: { width: number; height: number };
}

export interface BoundExample {
    setId: string;
    sourceId: string;
    referencePath: string;
    layoutClass: LayoutClass;
    space: 'comfortable' | 'constrained';
    state: ExampleState;
    viewport: { width: number; height: number };
    regions: string[];
    omittedCapabilities: string[];
}

function readJson<T>(path: string): T {
    return JSON.parse(
        readFileSync(resolve(REPOSITORY_ROOT, path), 'utf8')
    ) as T;
}

const binding = readJson<LayoutBinding>(BINDING_PATH);

export function capabilitiesWith(status: 'declared' | 'absent'): string[] {
    return binding.capabilities
        .filter((capability) => capability.status === status)
        .map(({ id }) => id);
}

export const boundExamples: BoundExample[] = binding.selections.map(
    (selection) => {
        const set = binding.example_sets.find(
            ({ set_id }) => set_id === selection.set_id
        );
        if (!set) throw new Error(`Ensemble inconnu : ${selection.set_id}`);
        const source = readJson<{ sources: ExampleSource[] }>(
            set.path
        ).sources.find(({ id }) => id === selection.source_id);
        if (!source)
            throw new Error(`Exemple inconnu : ${selection.source_id}`);
        return {
            setId: selection.set_id,
            sourceId: source.id,
            referencePath: source.path,
            layoutClass: source.layout_class,
            space: source.space,
            state: source.state,
            viewport: {
                width: source.viewport.width,
                height: source.viewport.height,
            },
            regions: selection.regions,
            omittedCapabilities: selection.omitted_capabilities,
        };
    }
);

export const COMPACT = { width: 390, height: 844 } as const;
export const MEDIUM_CONSTRAINED = { width: 960, height: 900 } as const;
export const EXPANDED = { width: 1440, height: 1024 } as const;
export const PAGE_SIZE = 10;
export const TOTAL_USERS = 42;

const LAST_NAMES = [
    'Alpha',
    'Bravo',
    'Charlie',
    'Delta',
    'Echo',
    'Foxtrot',
    'Golf',
    'Hotel',
    'India',
    'Juliett',
];
const PROFILES = [
    { uniq_id: 'profile-a', name: 'Profil A' },
    { uniq_id: 'profile-b', name: 'Profil B' },
    { uniq_id: 'profile-c', name: 'Profil C' },
];
const ROLES = ['supervisor', 'team-leader', 'agent', 'agent', 'agent'];

const USERS = Array.from({ length: TOTAL_USERS }, (_, index) => {
    const lastName = `${LAST_NAMES[index % LAST_NAMES.length]}${
        index < LAST_NAMES.length ? '' : ` ${Math.floor(index / 10) + 1}`
    }`;
    const updatedAt = `2026-09-${String(26 - (index % 20)).padStart(2, '0')}T08:00:00Z`;
    return {
        id: `user-${index + 1}`,
        first_name: 'Test',
        last_name: lastName,
        email: `user-${index + 1}@example.invalid`,
        phone: '+000 00 00 00 00',
        profile: PROFILES[index % PROFILES.length].name,
        role: ROLES[index % ROLES.length],
        status: index % 4 === 3 ? 'inactive' : 'active',
        created_at: updatedAt,
        updated_at: updatedAt,
    };
});

export async function installLayoutBackend(page: Page): Promise<string[]> {
    const usersRequests: string[] = [];
    await page.addInitScript(() => {
        window.__env = {
            authenticationUrl: '/api/auth/',
            reportUrl: '/api/report/',
            settingUrl: '/api/settings/',
            fileUrl: '/api/file/',
            environmentDeployment: 'DEV',
            enableDebug: false,
            trustedFrameOrigins: [],
        };
        window.__cmzAppAccessContext = {
            authenticated: true,
            permissions: ['users.create'],
        };
    });
    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const json = (data: unknown) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: false,
                    message: 'SUCCESS',
                    data,
                }),
            });
        if (
            request.method() === 'GET' &&
            url.pathname.endsWith(
                '/settings-and-security/user-profiles/select-field'
            )
        ) {
            await json(PROFILES);
            return;
        }
        if (
            request.method() === 'GET' &&
            url.pathname.endsWith('/settings-and-security/users')
        ) {
            usersRequests.push(url.search);
            const search = url.searchParams.get('search')?.toLowerCase();
            const profile = PROFILES.find(
                ({ uniq_id }) => uniq_id === url.searchParams.get('profile')
            )?.name;
            const role = url.searchParams.get('role');
            const isActive = url.searchParams.get('is_active');
            const matching = USERS.filter(
                (user) =>
                    (!search ||
                        `${user.last_name} ${user.first_name} ${user.email}`
                            .toLowerCase()
                            .includes(search)) &&
                    (!profile || user.profile === profile) &&
                    (!role || user.role === role) &&
                    (isActive === null ||
                        (user.status === 'active') === (isActive === 'true'))
            );
            const currentPage = Number(url.searchParams.get('page') ?? '1');
            await json({
                current_page: currentPage,
                last_page: Math.max(1, Math.ceil(matching.length / PAGE_SIZE)),
                per_page: PAGE_SIZE,
                total: matching.length,
                data: matching.slice(
                    (currentPage - 1) * PAGE_SIZE,
                    currentPage * PAGE_SIZE
                ),
            });
            return;
        }
        await route.abort('blockedbyclient');
    });
    return usersRequests;
}

export async function openReadyPage(page: Page): Promise<void> {
    await page.goto('/settings-security/users');
    await page.addStyleTag({
        content:
            '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}',
    });
    await page.evaluate(async () => document.fonts.ready);
    await expect(page.locator('[data-cmz-id="ready"]')).toBeVisible();
}

export async function settle(page: Page): Promise<void> {
    await page.evaluate(
        () =>
            new Promise<void>((done) => {
                requestAnimationFrame(() =>
                    requestAnimationFrame(() => done())
                );
            })
    );
    await page.waitForTimeout(250);
}

export function command(
    page: Page,
    id: 'create' | 'refresh' | 'filters'
): Locator {
    return page.locator(`[data-cmz-toolbar-action="${id}"]`);
}

export function searchInput(page: Page): Locator {
    return page.getByRole('searchbox', { name: 'Rechercher un utilisateur' });
}
