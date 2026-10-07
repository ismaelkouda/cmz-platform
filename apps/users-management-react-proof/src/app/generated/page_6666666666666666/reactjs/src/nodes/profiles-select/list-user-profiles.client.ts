import { decodeListUserProfilesResponse } from './list-user-profiles.decoder';
import type { ProfileOption } from './models';

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

export class ListUserProfilesClient {
    constructor(
        private readonly baseUrl: string,
        private readonly fetch: ListQueryFetchPort
    ) {}

    async readAll(
        options: ListQueryReadOptions
    ): Promise<readonly ProfileOption[]> {
        const response = await this.fetch({
            serviceId: 'settings-api',
            url: joinUrl(
                this.baseUrl,
                '/settings-and-security/user-profiles/select-field'
            ),
            method: 'GET',
            policy: REQUEST_POLICY,
            isRefresh: options.isRefresh,
            signal: options.signal,
        });
        if (!response.ok) throw new ListQueryHttpError(response.status);
        return decodeListUserProfilesResponse(await response.json());
    }
}
