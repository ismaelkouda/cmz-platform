import { HttpClient, type HttpContext } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    ACTION_REQUEST_BASE_URL,
    ActionRequestClient,
    PUBLIC_REQUEST,
} from '../../.stack-test-runtime/angular/action-request/src/action-request-client';
import {
    ActionRequestCommands,
    SESSION_PORT,
} from '../../.stack-test-runtime/angular/action-request/src/action-request-commands';

import {
    envelopedLoginResult,
    envelopedMessageResult,
    forgotInput,
    loginInput,
    loginResult,
    messageResult,
    resetInput,
} from '../../oracles/action-request-runtime-oracle.mjs';

interface RecordedRequest {
    readonly body: unknown;
    readonly method: string;
    readonly public: boolean;
    readonly url: string;
}

afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
});

function configureActionRequest(options?: {
    readonly persist?: (user: unknown, token: unknown) => Promise<void>;
    readonly responseFor?: (url: string) => unknown;
}) {
    const requests: RecordedRequest[] = [];
    const responseFor =
        options?.responseFor ??
        ((url: string) =>
            url.endsWith('/login')
                ? envelopedLoginResult
                : envelopedMessageResult);
    const http = {
        post(
            url: string,
            body: unknown,
            requestOptions: { context: HttpContext }
        ) {
            requests.push({
                body,
                method: 'POST',
                public: requestOptions.context.get(PUBLIC_REQUEST),
                url,
            });
            const response = responseFor(url);
            return response instanceof Error
                ? throwError(() => response)
                : of(response);
        },
    };
    const persist = options?.persist ?? vi.fn(async () => undefined);

    TestBed.configureTestingModule({
        providers: [
            { provide: HttpClient, useValue: http },
            {
                provide: ACTION_REQUEST_BASE_URL,
                useValue: 'https://auth.example.test/',
            },
            ActionRequestClient,
            {
                provide: SESSION_PORT,
                useValue: { persist },
            },
            ActionRequestCommands,
        ],
    });

    return {
        commands: TestBed.inject(ActionRequestCommands),
        persist,
        requests,
    };
}

describe('sortie Angular action-request', () => {
    it('résout les dépendances avec TestBed et respecte transport, session et ordre asynchrone', async () => {
        const events: string[] = [];
        const persist = vi.fn(async () => {
            events.push('persist:start');
            await Promise.resolve();
            events.push('persist:end');
        });
        const { commands, requests } = configureActionRequest({ persist });

        const login = await firstValueFrom(commands.login(loginInput));
        events.push('result');
        const forgot = await firstValueFrom(
            commands.forgotPassword(forgotInput)
        );
        const reset = await firstValueFrom(commands.resetPassword(resetInput));

        expect(login).toEqual(loginResult);
        expect(forgot).toEqual(messageResult);
        expect(reset).toEqual(messageResult);
        expect(events).toEqual(['persist:start', 'persist:end', 'result']);
        expect(persist).toHaveBeenCalledExactlyOnceWith(
            loginResult.user,
            loginResult.token
        );
        expect(requests).toEqual([
            {
                body: loginInput,
                method: 'POST',
                public: true,
                url: 'https://auth.example.test/login',
            },
            {
                body: forgotInput,
                method: 'POST',
                public: true,
                url: 'https://auth.example.test/forgot-password',
            },
            {
                body: resetInput,
                method: 'POST',
                public: true,
                url: 'https://auth.example.test/reset-password',
            },
        ]);
    });

    it('propage les erreurs de transport sans créer de session', async () => {
        const persist = vi.fn(async () => undefined);
        const { commands } = configureActionRequest({
            persist,
            responseFor: () => new Error('network unavailable'),
        });

        await expect(
            firstValueFrom(commands.login(loginInput))
        ).rejects.toThrow('network unavailable');
        expect(persist).not.toHaveBeenCalled();
    });

    it('propage une erreur de persistance de session', async () => {
        const { commands } = configureActionRequest({
            persist: async () => {
                throw new Error('storage unavailable');
            },
            responseFor: () => envelopedLoginResult,
        });

        await expect(
            firstValueFrom(commands.login(loginInput))
        ).rejects.toThrow('storage unavailable');
    });
});
