import { useCallback, useEffect, useRef, useState } from 'react';

import { createPageCompositionHooks } from '../../generated/page_6666666666666666/reactjs/src/page-composition.runtime';
import {
    CreateUserClient,
    type ActionRequestFetchPort,
    type ActionRequestFetchRequest,
} from '../../generated/page_6666666666666666/reactjs/src/nodes/create-user/create-user.client';
import {
    ListUserProfilesClient,
    type ListQueryFetchPort as ProfilesFetchPort,
    type ListQueryFetchRequest as ProfilesFetchRequest,
} from '../../generated/page_6666666666666666/reactjs/src/nodes/profiles-select/list-user-profiles.client';
import {
    ListUsersClient,
    type ListQueryFetchPort as UsersFetchPort,
    type ListQueryFetchRequest as UsersFetchRequest,
} from '../../generated/page_6666666666666666/reactjs/src/nodes/users-list/list-users.client';

const settingsServiceId = 'settings-api';

declare global {
    interface Window {
        /** Port public installé par le host avant le bootstrap React. */
        __cmzUsersManagementPageHost?: unknown;
    }
}

export type UsersManagementPageHostRequest =
    ActionRequestFetchRequest | ProfilesFetchRequest | UsersFetchRequest;

export interface UsersManagementPageHostResponse {
    readonly ok: boolean;
    readonly status: number;
    json(): Promise<unknown>;
}

export interface UsersManagementPageHost {
    readonly serviceBaseUrls: Readonly<{
        readonly 'settings-api': string;
    }>;
    readonly request: (
        request: UsersManagementPageHostRequest
    ) => Promise<UsersManagementPageHostResponse>;
}

export class PageHostConfigurationError extends Error {
    readonly code = 'PAGE_HOST_CONFIGURATION_ERROR';

    constructor(message: string) {
        super(message);
        this.name = 'PageHostConfigurationError';
    }
}

function normalizeBaseUrl(value: unknown): string {
    if (typeof value !== 'string' || value.length === 0) {
        throw new PageHostConfigurationError(
            `${settingsServiceId} requires a non-empty base URL`
        );
    }

    let parsed: URL;
    try {
        parsed = new URL(value);
    } catch {
        throw new PageHostConfigurationError(
            `${settingsServiceId} requires an absolute base URL`
        );
    }
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(
        parsed.hostname
    );
    if (
        (parsed.protocol !== 'https:' &&
            !(parsed.protocol === 'http:' && loopback)) ||
        parsed.username.length > 0 ||
        parsed.password.length > 0 ||
        parsed.search.length > 0 ||
        parsed.hash.length > 0
    ) {
        throw new PageHostConfigurationError(
            `${settingsServiceId} base URL must use HTTPS (or loopback HTTP) without credentials, query, or fragment`
        );
    }
    return parsed.href.endsWith('/') ? parsed.href : `${parsed.href}/`;
}

function assertRequestScope(
    request: UsersManagementPageHostRequest,
    baseUrl: string
): void {
    if (request.serviceId !== settingsServiceId) {
        throw new PageHostConfigurationError(
            `undeclared service ${request.serviceId}`
        );
    }
    const requested = new URL(request.url);
    const base = new URL(baseUrl);
    const basePath = base.pathname.endsWith('/')
        ? base.pathname
        : `${base.pathname}/`;
    if (
        requested.origin !== base.origin ||
        !requested.pathname.startsWith(basePath)
    ) {
        throw new PageHostConfigurationError(
            `${settingsServiceId} request escapes its configured base URL`
        );
    }
}

export function createUsersManagementPageRuntime(
    host: UsersManagementPageHost
) {
    const serviceIds = Object.keys(host.serviceBaseUrls ?? {}).sort();
    if (serviceIds.length !== 1 || serviceIds[0] !== settingsServiceId) {
        throw new PageHostConfigurationError(
            `host services must contain exactly ${settingsServiceId}`
        );
    }
    const settingsBaseUrl = normalizeBaseUrl(
        host.serviceBaseUrls?.[settingsServiceId]
    );
    const request = host.request;
    if (typeof request !== 'function') {
        throw new PageHostConfigurationError('host request port is required');
    }

    const forward = (hostRequest: UsersManagementPageHostRequest) => {
        assertRequestScope(hostRequest, settingsBaseUrl);
        return request(hostRequest);
    };
    const actionFetch: ActionRequestFetchPort = forward;
    const profilesFetch: ProfilesFetchPort = forward;
    const usersFetch: UsersFetchPort = forward;

    return createPageCompositionHooks(
        { useCallback, useEffect, useRef, useState },
        {
            createUserClient: new CreateUserClient(
                settingsBaseUrl,
                actionFetch
            ),
            profilesSelectClient: new ListUserProfilesClient(
                settingsBaseUrl,
                profilesFetch
            ),
            usersListClient: new ListUsersClient(settingsBaseUrl, usersFetch),
        }
    );
}

export function createBrowserUsersManagementPageRuntime(
    raw: unknown = window.__cmzUsersManagementPageHost
) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new PageHostConfigurationError(
            'browser page host is absent or invalid'
        );
    }

    const candidate = raw as Record<string, unknown>;
    const keys = Object.keys(candidate).sort();
    if (
        keys.length !== 2 ||
        keys[0] !== 'request' ||
        keys[1] !== 'serviceBaseUrls'
    ) {
        throw new PageHostConfigurationError(
            'browser page host must contain exactly request and serviceBaseUrls'
        );
    }

    return createUsersManagementPageRuntime(
        candidate as unknown as UsersManagementPageHost
    );
}
