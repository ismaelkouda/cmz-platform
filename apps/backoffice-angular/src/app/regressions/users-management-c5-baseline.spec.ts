import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, BYPASS_CACHE } from '@cmz/core';
import { UsersFacade } from '@cmz/settings-security-application';
import type { UsersResponseApiDto } from '@cmz/settings-security-data';
import { UsersStatus } from '@cmz/settings-security-domain';
import {
    ErrorHandlerRegistry,
    NOTIFICATION_PORT,
} from '@cmz/shared-application';
import { Role } from '@cmz/shared-domain';
import { TranslocoService } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { provideSettingsSecurity } from '../providers/settings-security.providers';
import { A11Y_TEST_APP_CONFIG } from '../testing/a11y-testbed.harness';

/**
 * Baseline C5 figée avant de réaliser la composition générique.
 *
 * Ce spec traverse les vrais ports domain/data/application de SEOS et remplace
 * uniquement le réseau par `HttpTestingController`. Il constitue l'autorité
 * comportementale du premier vertical slice, pas un test du futur générateur.
 * La future sortie doit reproduire les observations utiles (wire, mapping,
 * succès, notification et invalidation ciblée) sans importer ces classes.
 */
describe('C5 baseline — users list + create', () => {
    const notification = {
        notify: vi.fn(),
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
        info: vi.fn(),
    };
    const translation = {
        translate: vi.fn(
            (key: string, _params?: unknown) => `translated:${key}`
        ),
    };

    let facade: UsersFacade;
    let http: HttpTestingController;

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                ...provideSettingsSecurity(),
                {
                    provide: APP_CONFIG,
                    useValue: { ...A11Y_TEST_APP_CONFIG },
                },
                { provide: NOTIFICATION_PORT, useValue: notification },
                { provide: TranslocoService, useValue: translation },
            ],
        });
        facade = TestBed.inject(UsersFacade);
        http = TestBed.inject(HttpTestingController);
        TestBed.inject(ErrorHandlerRegistry).registerDefault((error) =>
            notification.error(
                translation.translate(error.messageKey, error.params)
            )
        );
    });

    afterEach(() => {
        http.verify();
        TestBed.resetTestingModule();
    });

    /** Laisse `rxResource` franchir sa file de micro/macro-tâches interne. */
    async function settleResource(): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, 0));
    }

    function response(): UsersResponseApiDto {
        return {
            error: false,
            message: 'SUCCESS',
            data: {
                current_page: 2,
                data: [
                    {
                        id: 'usr-001',
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
                first_page_url: '',
                from: 11,
                last_page: 3,
                last_page_url: '',
                links: [],
                next_page_url: '',
                path: '',
                per_page: 10,
                prev_page_url: '',
                to: 11,
                total: 21,
            },
        };
    }

    async function startList(): Promise<void> {
        facade.load(
            {
                search: 'Kouda',
                profile: 'Administrateur',
                role: Role.LEADER,
                status: UsersStatus.ACTIVE,
            },
            '2',
            { forceRefresh: true }
        );
        await settleResource();
    }

    function expectUsersListRequest() {
        const expectedUrl =
            'https://test.invalid/settings/settings-and-security/users?page=2&search=Kouda&profile=Administrateur&role=team-leader&is_active=true';
        const request = http.expectOne(
            (candidate) =>
                candidate.method === 'GET' &&
                candidate.urlWithParams === expectedUrl
        );
        expect(request.request.urlWithParams).toBe(expectedUrl);
        expect(request.request.context.get(BYPASS_CACHE)).toBe(true);
        return request;
    }

    it('observe le GET paginé, ses filtres wire et le mapping du résultat', async () => {
        await startList();
        expectUsersListRequest().flush(response());
        await vi.waitFor(() => expect(facade.items()).toHaveLength(1));

        expect(facade.items()[0]).toMatchObject({
            uniqId: 'usr-001',
            firstName: 'Awa',
            lastName: 'Kouda',
            email: 'awa.kouda@example.test',
            phone: '+2250102030405',
            profile: 'Administrateur',
            status: 'active',
            updatedAt: '2026-09-24T18:00:00Z',
        });
        expect(facade.value()).toMatchObject({
            currentPage: 2,
            lastPage: 3,
            perPage: 10,
            total: 21,
        });
    });

    it('après création réussie, notifie puis recharge exactement la liste courante', async () => {
        await startList();
        expectUsersListRequest().flush(response());
        await vi.waitFor(() => expect(facade.items()).toHaveLength(1));

        facade.create({
            firstName: 'Mariam',
            lastName: 'Koné',
            email: 'mariam.kone@example.test',
            phone: '+2250506070809',
            profileId: 'profile-admin',
        });

        const create = http.expectOne(
            'https://test.invalid/settings/settings-and-security/users/store'
        );
        expect(create.request.method).toBe('POST');
        expect(create.request.body).toEqual({
            first_name: 'Mariam',
            last_name: 'Koné',
            email: 'mariam.kone@example.test',
            phone: '+2250506070809',
            profile_id: 'profile-admin',
        });
        expect(facade.actionState()).toBe('loading');

        create.flush({ error: false, message: 'SUCCESS' });
        await settleResource();

        expect(notification.success).toHaveBeenCalledWith(
            'translated:COMMON.SUCCESS.CREATE'
        );
        expect(facade.actionSuccess()).toBe(1);
        expectUsersListRequest().flush(response());
        await vi.waitFor(() => expect(facade.actionState()).toBe('idle'));
    });

    it('après échec de création, conserve la liste et ne déclenche aucun reload', async () => {
        await startList();
        expectUsersListRequest().flush(response());
        await vi.waitFor(() => expect(facade.items()).toHaveLength(1));

        facade.create({
            firstName: 'Mariam',
            lastName: 'Koné',
            email: 'duplicate@example.test',
            phone: '+2250506070809',
            profileId: 'profile-admin',
        });
        const create = http.expectOne(
            'https://test.invalid/settings/settings-and-security/users/store'
        );
        create.flush(
            { error: true, message: 'EMAIL_ALREADY_EXISTS' },
            { status: 422, statusText: 'Unprocessable Entity' }
        );
        await settleResource();

        await vi.waitFor(() => expect(facade.actionState()).toBe('idle'));
        expect(facade.actionSuccess()).toBe(0);
        expect(facade.actionError()).toBeTruthy();
        expect(facade.items()).toHaveLength(1);
        expect(notification.success).not.toHaveBeenCalled();
        expect(notification.error).toHaveBeenCalledOnce();
        expect(http.match((request) => request.method === 'GET')).toHaveLength(
            0
        );
    });
});
