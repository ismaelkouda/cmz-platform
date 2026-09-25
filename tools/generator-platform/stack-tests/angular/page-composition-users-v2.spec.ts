import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
    EnvironmentInjector,
    createEnvironmentInjector,
    signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
    BYPASS_CACHE,
    HttpCacheStore,
    SETTINGS_API_URL,
    SKIP_AUTH,
    cacheInterceptor,
} from '@cmz/core';
import { ErrorHandlerRegistry, SessionService } from '@cmz/shared-application';
import { errorInterceptor } from '@cmz/shared-data';
import { InvalidPayloadError, ServerResponseError } from '@cmz/shared-domain';
import { firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { authInterceptor } from '../../../../apps/backoffice-angular/src/app/interceptors/auth.interceptor';
import { PageComposition } from '../../.stack-test-runtime/angular/page-composition-users-v2/src/page-composition';
import { PAGE_COMPOSITION_PROVIDERS } from '../../.stack-test-runtime/angular/page-composition-users-v2/src/page-composition.providers';

const settingsBaseUrl = 'https://settings.example.test/';
const usersUrl = `${settingsBaseUrl}settings-and-security/users?page=1`;
const profilesUrl = `${settingsBaseUrl}settings-and-security/user-profiles/select-field`;
const createUserUrl = `${settingsBaseUrl}settings-and-security/users/store`;

interface Runtime {
    readonly composition: PageComposition;
    readonly http: HttpTestingController;
}

function configureRuntime(): Runtime {
    const errorHandler = { handle: vi.fn() };
    TestBed.configureTestingModule({
        providers: [
            provideHttpClient(
                withInterceptors([
                    authInterceptor,
                    errorInterceptor,
                    cacheInterceptor,
                ])
            ),
            provideHttpClientTesting(),
            {
                provide: SessionService,
                useValue: { token: signal({ value: 'session-token' }) },
            },
            { provide: SETTINGS_API_URL, useValue: settingsBaseUrl },
            { provide: ErrorHandlerRegistry, useValue: errorHandler },
            HttpCacheStore,
            ...PAGE_COMPOSITION_PROVIDERS,
        ],
    });
    return {
        composition: TestBed.inject(PageComposition),
        http: TestBed.inject(HttpTestingController),
    };
}

async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
}

function flushUsers(
    request: ReturnType<HttpTestingController['expectOne']>
): void {
    request.flush({
        error: false,
        message: 'SUCCESS',
        data: {
            current_page: 1,
            data: [
                {
                    id: 'user-1',
                    first_name: 'Awa',
                    last_name: 'Kouda',
                    email: 'awa.kouda@example.test',
                    phone: '+2250102030405',
                    profile: 'Administrateur',
                    role: null,
                    status: 'active',
                    created_at: '2026-09-01T08:00:00Z',
                    updated_at: '2026-09-24T18:00:00Z',
                },
            ],
            last_page: 2,
            per_page: 10,
            total: 11,
        },
    });
}

function flushProfiles(
    request: ReturnType<HttpTestingController['expectOne']>
): void {
    request.flush({
        error: false,
        message: 'SUCCESS',
        data: [{ uniq_id: 'profile-admin', name: 'Administrateur' }],
    });
}

function userInput(email = 'mariam.kone@example.test') {
    return {
        firstName: 'Mariam',
        lastName: 'Koné',
        email,
        phone: '+2250506070809',
        profileId: 'profile-admin',
    };
}

afterEach(() => {
    TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true });
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
});

describe('page composition C5 Angular — oracle externe hermétique', () => {
    it('charge users-list et profiles-select avec le host, l’auth et les mappings réels', async () => {
        const { composition, http } = configureRuntime();

        composition.usersList.load({ page: 1 });
        composition.profilesSelect.load();
        await settle();

        const users = http.expectOne(usersUrl);
        const profiles = http.expectOne(profilesUrl);
        for (const request of [users, profiles]) {
            expect(request.request.method).toBe('GET');
            expect(request.request.headers.get('Authorization')).toBe(
                'Bearer session-token'
            );
            expect(request.request.context.get(SKIP_AUTH)).toBe(false);
            expect(request.request.context.get(BYPASS_CACHE)).toBe(false);
        }
        flushUsers(users);
        flushProfiles(profiles);
        await settle();

        expect(composition.usersList.items()).toEqual([
            {
                uniqId: 'user-1',
                firstName: 'Awa',
                lastName: 'Kouda',
                email: 'awa.kouda@example.test',
                phone: '+2250102030405',
                profile: 'Administrateur',
                role: null,
                status: 'active',
                updatedAt: '2026-09-24T18:00:00Z',
            },
        ]);
        expect(composition.usersList.page()).toMatchObject({
            currentPage: 1,
            lastPage: 2,
            pageSize: 10,
            totalItems: 11,
        });
        expect(composition.profilesSelect.items()).toEqual([
            { value: 'profile-admin', label: 'Administrateur' },
        ]);
    });

    it('crée l’utilisateur puis rafraîchit seulement users-list après le succès distant', async () => {
        const { composition, http } = configureRuntime();
        composition.usersList.load({ page: 1 });
        composition.profilesSelect.load();
        await settle();
        flushUsers(http.expectOne(usersUrl));
        flushProfiles(http.expectOne(profilesUrl));
        await settle();

        const submitted = firstValueFrom(
            composition.createUser.submit(userInput())
        );
        const command = http.expectOne(createUserUrl);
        expect(command.request.method).toBe('POST');
        expect(command.request.body).toEqual({
            first_name: 'Mariam',
            last_name: 'Koné',
            email: 'mariam.kone@example.test',
            phone: '+2250506070809',
            profile_id: 'profile-admin',
        });
        expect(command.request.headers.get('Authorization')).toBe(
            'Bearer session-token'
        );
        expect(command.request.context.get(SKIP_AUTH)).toBe(false);
        expect(command.request.headers.has('Idempotency-Key')).toBe(false);
        command.flush({ error: false, message: 'SUCCESS' });

        await expect(submitted).resolves.toEqual({ message: 'SUCCESS' });
        await settle();

        const refresh = http.expectOne(usersUrl);
        expect(refresh.request.context.get(BYPASS_CACHE)).toBe(true);
        http.expectNone(profilesUrl);
        flushUsers(refresh);
        await settle();
        expect(composition.usersList.state()).toBe('success');
        expect(composition.profilesSelect.state()).toBe('success');
        expect(composition.createUser.state()).toBe('success');
    });

    it('conserve les deux queries et n’invalide rien sur erreur métier déclarée', async () => {
        const { composition, http } = configureRuntime();
        composition.usersList.load({ page: 1 });
        composition.profilesSelect.load();
        await settle();
        flushUsers(http.expectOne(usersUrl));
        flushProfiles(http.expectOne(profilesUrl));
        await settle();

        const submitted = firstValueFrom(
            composition.createUser.submit(userInput('duplicate@example.test'))
        );
        http.expectOne(createUserUrl).flush({
            error: true,
            message: 'EMAIL_ALREADY_EXISTS',
        });

        await expect(submitted).rejects.toBeInstanceOf(ServerResponseError);
        await settle();
        expect(composition.createUser.state()).toBe('error');
        expect(composition.usersList.items()).toHaveLength(1);
        expect(composition.profilesSelect.items()).toHaveLength(1);
        http.expectNone((request) => request.method === 'GET');
    });

    it('refuse un formulaire invalide avant le réseau et sans invalider la liste', async () => {
        const { composition, http } = configureRuntime();

        await expect(
            firstValueFrom(
                composition.createUser.submit(userInput('not-an-email'))
            )
        ).rejects.toBeInstanceOf(InvalidPayloadError);

        http.expectNone(createUserUrl);
        http.expectNone((request) => request.method === 'GET');
        expect(composition.createUser.state()).toBe('error');
    });

    it('refuse le double submit sans second POST ni invalidation anticipée', async () => {
        const { composition, http } = configureRuntime();
        const first = firstValueFrom(
            composition.createUser.submit(userInput('first@example.test'))
        );
        const request = http.expectOne(createUserUrl);

        await expect(
            firstValueFrom(
                composition.createUser.submit(userInput('second@example.test'))
            )
        ).rejects.toMatchObject({ code: 'ACTION_REQUEST_PENDING' });
        expect(composition.createUser.state()).toBe('submitting');
        http.expectNone(
            (candidate) => candidate.body?.email === 'second@example.test'
        );
        http.expectNone((candidate) => candidate.method === 'GET');

        request.flush({ error: false, message: 'SUCCESS' });
        await expect(first).resolves.toEqual({ message: 'SUCCESS' });
        expect(composition.createUser.state()).toBe('success');
        http.expectNone((candidate) => candidate.method === 'GET');
    });

    it('annule les deux GET quand le scope de page est détruit', async () => {
        const { http } = configureRuntime();
        const pageScope = createEnvironmentInjector(
            [...PAGE_COMPOSITION_PROVIDERS],
            TestBed.inject(EnvironmentInjector)
        );
        const composition = pageScope.get(PageComposition);

        composition.usersList.load({ page: 1 });
        composition.profilesSelect.load();
        await settle();
        const users = http.expectOne(usersUrl);
        const profiles = http.expectOne(profilesUrl);

        pageScope.destroy();

        expect(users.cancelled).toBe(true);
        expect(profiles.cancelled).toBe(true);
    });
});
