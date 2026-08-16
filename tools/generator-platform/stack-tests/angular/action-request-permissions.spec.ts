import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    ACTION_REQUEST_BASE_URL,
    ActionRequestClient,
} from '../../.stack-test-runtime/angular/action-request-authorized/src/action-request-client';
import {
    ActionRequestCommands,
    PERMISSION_PORT,
    PermissionDeniedError,
} from '../../.stack-test-runtime/angular/action-request-authorized/src/action-request-commands';

const input = {
    email: 'person@example.com',
    subject: 'Cannot open a report',
    message: 'The report remains unavailable.',
    priority: 'high',
};
const result = {
    request_id: 'support-42',
    message: 'Request accepted',
};

afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
});

function configure(granted: ReadonlySet<string>) {
    const post = vi.fn(() => of(result));
    const has = vi.fn((permission: string) => granted.has(permission));
    TestBed.configureTestingModule({
        providers: [
            { provide: HttpClient, useValue: { post } },
            {
                provide: ACTION_REQUEST_BASE_URL,
                useValue: 'https://api.example.test/',
            },
            { provide: PERMISSION_PORT, useValue: { has } },
            ActionRequestClient,
            ActionRequestCommands,
        ],
    });
    return {
        commands: TestBed.inject(ActionRequestCommands),
        has,
        post,
    };
}

describe('permissions Angular action-request', () => {
    it('refuse avant HTTP avec une erreur stable si la permission manque', async () => {
        const { commands, has, post } = configure(new Set());

        await expect(
            firstValueFrom(commands.contactSupport(input))
        ).rejects.toMatchObject({
            name: 'PermissionDeniedError',
            code: 'permission_denied',
            missingPermissions: ['support.submit'],
        });
        expect(has).toHaveBeenCalledExactlyOnceWith('support.submit');
        expect(post).not.toHaveBeenCalled();
    });

    it('exécute HTTP exactement une fois lorsque toutes les permissions sont présentes', async () => {
        const { commands, has, post } = configure(new Set(['support.submit']));

        await expect(
            firstValueFrom(commands.contactSupport(input))
        ).resolves.toEqual(result);
        expect(has).toHaveBeenCalledExactlyOnceWith('support.submit');
        expect(post).toHaveBeenCalledOnce();
    });

    it('échoue au câblage si le port de permissions obligatoire est absent', () => {
        TestBed.configureTestingModule({
            providers: [
                { provide: HttpClient, useValue: { post: vi.fn() } },
                {
                    provide: ACTION_REQUEST_BASE_URL,
                    useValue: 'https://api.example.test/',
                },
                ActionRequestClient,
                ActionRequestCommands,
            ],
        });

        expect(() => TestBed.inject(ActionRequestCommands)).toThrow();
        expect(PermissionDeniedError).toBeDefined();
    });
});
