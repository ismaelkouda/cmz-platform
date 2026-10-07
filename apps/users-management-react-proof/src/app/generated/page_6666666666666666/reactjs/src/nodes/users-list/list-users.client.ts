import { InvalidPayloadError } from './errors';
import { decodeListUsersResponse } from './list-users.decoder';
import type { ListUsersInput, ListUsersPage } from './models';

export interface ListQueryRequestPolicy {
    readonly authentication:
        | { readonly mode: 'omit' }
        | {
              readonly mode: 'host';
              readonly schemes: readonly {
                  readonly id: string;
                  readonly kind: 'bearer';
              }[];
          };
    readonly cache: {
        readonly mode: 'host';
        readonly scope: 'principal' | 'public';
        readonly refresh: 'bypass';
    };
}

export interface ListQueryFetchResponse {
    readonly ok: boolean;
    readonly status: number;
    json(): Promise<unknown>;
}

export interface ListQueryFetchRequest {
    readonly serviceId: string;
    readonly url: string;
    readonly method: 'GET';
    readonly policy: ListQueryRequestPolicy;
    readonly isRefresh: boolean;
    readonly signal: AbortSignal;
}

export type ListQueryFetchPort = (
    request: ListQueryFetchRequest
) => Promise<ListQueryFetchResponse>;

export interface ListQueryReadOptions {
    readonly isRefresh: boolean;
    readonly signal: AbortSignal;
}

export class ListQueryHttpError extends Error {
    constructor(readonly status: number) {
        super(`HTTP ${status}`);
        this.name = 'ListQueryHttpError';
    }
}

const REQUEST_POLICY: ListQueryRequestPolicy = {
    authentication: {
        mode: 'host',
        schemes: [
            {
                id: 'backoffice-session-bearer',
                kind: 'bearer',
            },
        ],
    },
    cache: {
        mode: 'host',
        scope: 'principal',
        refresh: 'bypass',
    },
};

function joinUrl(baseUrl: string, path: string): string {
    const normalizedBaseUrl = baseUrl.endsWith('/')
        ? baseUrl.slice(0, -1)
        : baseUrl;
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    return [normalizedBaseUrl, normalizedPath].join('/');
}

function invalidInput(path: string, expected: string): never {
    throw new InvalidPayloadError(path, expected);
}

function requestUrl(baseUrl: string, input: ListUsersInput): string {
    const parameters: [string, string][] = [];
    const parameter0 = input['page'];
    if (parameter0 === undefined) invalidInput('$.page', 'required');
    if (typeof parameter0 !== 'number' || !Number.isInteger(parameter0))
        invalidInput('$.page', 'integer');
    if (parameter0 < 1) invalidInput('$.page', 'minimum 1');
    parameters.push(['page', String(parameter0)]);
    const parameter1 = input['search'];
    if (parameter1 !== undefined) {
        if (typeof parameter1 !== 'string') invalidInput('$.search', 'string');
        if (parameter1.length < 1) invalidInput('$.search', 'min length 1');
        parameters.push(['search', String(parameter1)]);
    }
    const parameter2 = input['profile'];
    if (parameter2 !== undefined) {
        if (typeof parameter2 !== 'string') invalidInput('$.profile', 'string');
        if (parameter2.length < 1) invalidInput('$.profile', 'min length 1');
        parameters.push(['profile', String(parameter2)]);
    }
    const parameter3 = input['role'];
    if (parameter3 !== undefined) {
        if (typeof parameter3 !== 'string') invalidInput('$.role', 'string');
        if (!new RegExp('^(supervisor|team-leader|agent)$').test(parameter3))
            invalidInput('$.role', 'declared pattern');
        parameters.push(['role', String(parameter3)]);
    }
    const parameter4 = input['isActive'];
    if (parameter4 !== undefined) {
        if (typeof parameter4 !== 'boolean')
            invalidInput('$.isActive', 'boolean');
        parameters.push(['is_active', String(parameter4)]);
    }
    const url = joinUrl(baseUrl, '/settings-and-security/users');
    const queryString = parameters
        .map(
            ([name, value]) =>
                `${encodeURIComponent(name)}=${encodeURIComponent(value)}`
        )
        .join('&');
    return queryString.length === 0 ? url : `${url}?${queryString}`;
}

export class ListUsersClient {
    constructor(
        private readonly baseUrl: string,
        private readonly fetch: ListQueryFetchPort
    ) {}

    async readAll(
        input: ListUsersInput,
        options: ListQueryReadOptions
    ): Promise<ListUsersPage> {
        const response = await this.fetch({
            serviceId: 'settings-api',
            url: requestUrl(this.baseUrl, input),
            method: 'GET',
            policy: REQUEST_POLICY,
            isRefresh: options.isRefresh,
            signal: options.signal,
        });
        if (!response.ok) throw new ListQueryHttpError(response.status);
        return decodeListUsersResponse(await response.json());
    }
}
