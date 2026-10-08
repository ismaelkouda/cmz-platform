import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { UsersManagementPageHostRequest } from './page-host';
import { Pagepage6666666666666666 } from './page';

const SETTINGS_BASE_URL = [
    'https:',
    '',
    'settings.example.test',
    'backoffice',
    '',
].join('/');
const USERS_RESOURCE = ['settings-and-security', 'users'].join('/');
const PROFILES_RESOURCE = [
    'settings-and-security',
    'user-profiles',
    'select-field',
].join('/');

const USERS_RESPONSE = {
    error: false,
    message: 'SUCCESS',
    data: {
        current_page: 1,
        last_page: 2,
        per_page: 10,
        total: 24,
        data: [
            {
                id: 'user-1',
                first_name: 'Mariam',
                last_name: 'Koné',
                email: 'mariam.kone@example.test',
                phone: '+2250506070809',
                profile: 'Administrateur',
                role: 'supervisor',
                status: 'active',
                created_at: '2026-09-01T08:00:00.000Z',
                updated_at: '2026-10-01T10:30:00.000Z',
            },
        ],
    },
};

const PROFILES_RESPONSE = {
    error: false,
    message: 'SUCCESS',
    data: [{ uniq_id: 'profile-admin', name: 'Administrateur' }],
};

function response(payload: unknown, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => payload,
    };
}

function installHost(
    request: (
        hostRequest: UsersManagementPageHostRequest
    ) => Promise<ReturnType<typeof response>>,
    permissions: readonly string[] = ['users.create']
) {
    window.__cmzAppAccessContext = {
        authenticated: true,
        permissions,
    };
    window.__cmzUsersManagementPageHost = {
        serviceBaseUrls: {
            'settings-api': SETTINGS_BASE_URL,
        },
        request,
    };
}

function successfulRequestRecorder(requests: UsersManagementPageHostRequest[]) {
    return async (request: UsersManagementPageHostRequest) => {
        requests.push(request);
        if (request.method === 'POST') {
            return response({ error: false, message: 'Utilisateur créé.' });
        }
        if (request.url.includes('user-profiles')) {
            return response(PROFILES_RESPONSE);
        }
        return response(USERS_RESPONSE);
    };
}

afterEach(() => {
    cleanup();
    delete window.__cmzAppAccessContext;
    delete window.__cmzUsersManagementPageHost;
});

describe('users management React page', () => {
    it('loads the declared queries and renders the normalized user view', async () => {
        const requests: UsersManagementPageHostRequest[] = [];
        installHost(successfulRequestRecorder(requests));

        render(<Pagepage6666666666666666 />);

        expect(
            await screen.findByRole('cell', { name: /Koné Mariam/ })
        ).toBeTruthy();
        expect(screen.getAllByText('mariam.kone@example.test')).toHaveLength(1);
        expect(screen.getByLabelText('24 utilisateurs au total')).toBeTruthy();
        expect(requests).toHaveLength(2);
        expect(requests.map(({ method }) => method).sort()).toEqual([
            'GET',
            'GET',
        ]);
        expect(requests.map(({ url }) => url).sort()).toEqual([
            `${SETTINGS_BASE_URL}${PROFILES_RESOURCE}`,
            `${SETTINGS_BASE_URL}${USERS_RESOURCE}?page=1`,
        ]);
    });

    it('keeps creation visibly denied and never sends a command', async () => {
        const requests: UsersManagementPageHostRequest[] = [];
        installHost(successfulRequestRecorder(requests), []);

        render(<Pagepage6666666666666666 />);

        await screen.findByRole('cell', { name: /Koné Mariam/ });
        const createButton = screen.getByRole('button', {
            name: 'Créer un utilisateur',
        });
        expect((createButton as HTMLButtonElement).disabled).toBe(true);
        fireEvent.click(createButton);
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(requests.every(({ method }) => method === 'GET')).toBe(true);
    });

    it('validates, submits the exact command, closes, and refreshes the list', async () => {
        const requests: UsersManagementPageHostRequest[] = [];
        installHost(successfulRequestRecorder(requests));
        render(<Pagepage6666666666666666 />);

        await screen.findByRole('cell', { name: /Koné Mariam/ });
        fireEvent.click(
            screen.getByRole('button', { name: 'Créer un utilisateur' })
        );

        const dialog = await screen.findByRole('dialog');
        fireEvent.submit(dialog.querySelector('form') as HTMLFormElement);
        expect(document.activeElement).toBe(screen.getByLabelText(/^Nom/));
        expect(requests.filter(({ method }) => method === 'POST')).toHaveLength(
            0
        );

        fireEvent.change(screen.getByLabelText(/^Nom/), {
            target: { value: 'Diabaté' },
        });
        fireEvent.change(screen.getByLabelText(/^Prénom/), {
            target: { value: 'Awa' },
        });
        fireEvent.change(screen.getByLabelText(/^Adresse e-mail/), {
            target: { value: 'awa.diabate@example.test' },
        });
        fireEvent.change(screen.getByLabelText(/^Téléphone/), {
            target: { value: '+2250102030405' },
        });
        fireEvent.change(screen.getByLabelText(/^Profil/), {
            target: { value: 'profile-admin' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Créer' }));

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).toBeNull();
        });
        expect(screen.getByRole('status').textContent).toContain(
            'Utilisateur créé.'
        );
        const command = requests.find(({ method }) => method === 'POST');
        expect(command).toMatchObject({
            method: 'POST',
            body: {
                first_name: 'Awa',
                last_name: 'Diabaté',
                email: 'awa.diabate@example.test',
                phone: '+2250102030405',
                profile_id: 'profile-admin',
            },
        });
        await waitFor(() => {
            expect(
                requests.filter(
                    ({ method, url }) =>
                        method === 'GET' && url.includes(`${USERS_RESOURCE}?`)
                )
            ).toHaveLength(2);
        });
    });

    it('keeps the dialog open and announces a server rejection', async () => {
        const requests: UsersManagementPageHostRequest[] = [];
        installHost(async (request) => {
            requests.push(request);
            if (request.method === 'POST') {
                return response({
                    error: true,
                    message: 'Cette adresse e-mail existe déjà.',
                });
            }
            if (request.url.includes('user-profiles')) {
                return response(PROFILES_RESPONSE);
            }
            return response(USERS_RESPONSE);
        });
        render(<Pagepage6666666666666666 />);

        await screen.findByRole('cell', { name: /Koné Mariam/ });
        fireEvent.click(
            screen.getByRole('button', { name: 'Créer un utilisateur' })
        );
        fireEvent.change(screen.getByLabelText('Nom'), {
            target: { value: 'Koné' },
        });
        fireEvent.change(screen.getByLabelText('Prénom'), {
            target: { value: 'Mariam' },
        });
        fireEvent.change(screen.getByLabelText('Adresse e-mail'), {
            target: { value: 'mariam.kone@example.test' },
        });
        fireEvent.change(screen.getByLabelText('Téléphone'), {
            target: { value: '+2250506070809' },
        });
        fireEvent.change(screen.getByLabelText('Profil'), {
            target: { value: 'profile-admin' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Créer' }));

        expect((await screen.findByRole('alert')).textContent).toContain(
            'Cette adresse e-mail existe déjà.'
        );
        expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('keeps draft filters local until apply and sends the normalized query', async () => {
        const requests: UsersManagementPageHostRequest[] = [];
        installHost(successfulRequestRecorder(requests));
        render(<Pagepage6666666666666666 />);

        await screen.findByRole('cell', { name: /Koné Mariam/ });
        fireEvent.click(screen.getByRole('button', { name: 'Filtres' }));
        fireEvent.change(screen.getByLabelText('Profil'), {
            target: { value: 'profile-admin' },
        });
        fireEvent.click(screen.getByRole('radio', { name: 'Actifs' }));
        expect(requests).toHaveLength(2);
        fireEvent.click(screen.getByRole('button', { name: 'Appliquer' }));

        await waitFor(() => {
            expect(requests.at(-1)?.url).toBe(
                `${SETTINGS_BASE_URL}${USERS_RESOURCE}?page=1&profile=profile-admin&is_active=true`
            );
        });
        expect(
            screen
                .getByRole('button', { name: 'Filtres, 2 actifs' })
                .getAttribute('aria-expanded')
        ).toBe('false');
    });
});
