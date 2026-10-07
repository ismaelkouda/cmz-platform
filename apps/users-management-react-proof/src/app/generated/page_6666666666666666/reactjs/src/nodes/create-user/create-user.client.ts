import { decodeCreateUserResponse } from './create-user.decoder';
import type {
    CreateUserInput,
    CreateUserRequestWire,
    CreateUserResult,
} from './models';
import { InvalidPayloadError, validateCreateUserInput } from './validation';

export interface ActionRequestPolicy {
    readonly authentication: {
        readonly mode: 'host';
        readonly schemes: readonly {
            readonly id: string;
            readonly kind: 'bearer';
        }[];
    };
}

export interface ActionRequestFetchResponse {
    readonly ok: boolean;
    readonly status: number;
    json(): Promise<unknown>;
}

export interface ActionRequestFetchRequest {
    readonly serviceId: string;
    readonly url: string;
    readonly method: 'POST';
    readonly headers: Readonly<Record<string, string>>;
    readonly policy: ActionRequestPolicy;
    readonly body: CreateUserRequestWire;
}

export type ActionRequestFetchPort = (
    request: ActionRequestFetchRequest
) => Promise<ActionRequestFetchResponse>;

export class ActionRequestHttpError extends Error {
    constructor(readonly status: number) {
        super(`HTTP ${status}`);
        this.name = 'ActionRequestHttpError';
    }
}

const REQUEST_POLICY: ActionRequestPolicy = {
    authentication: {
        mode: 'host',
        schemes: [
            {
                id: 'backoffice-session-bearer',
                kind: 'bearer',
            },
        ],
    },
};

function joinUrl(baseUrl: string, path: string): string {
    const normalizedBaseUrl = baseUrl.endsWith('/')
        ? baseUrl.slice(0, -1)
        : baseUrl;
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    return [normalizedBaseUrl, normalizedPath].join('/');
}

export class CreateUserClient {
    constructor(
        private readonly baseUrl: string,
        private readonly fetch: ActionRequestFetchPort
    ) {}

    async execute(input: CreateUserInput): Promise<CreateUserResult> {
        const validated = validateCreateUserInput(input);
        const body: CreateUserRequestWire = {
            first_name: validated['firstName'],
            last_name: validated['lastName'],
            email: validated['email'],
            phone: validated['phone'],
            profile_id: validated['profileId'],
        };
        const response = await this.fetch({
            serviceId: 'settings-api',
            url: joinUrl(this.baseUrl, '/settings-and-security/users/store'),
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            policy: REQUEST_POLICY,
            body,
        });
        if (!response.ok) throw new ActionRequestHttpError(response.status);
        if (response.status !== 200) {
            throw new InvalidPayloadError('$.status', 'HTTP 200');
        }
        return decodeCreateUserResponse(await response.json());
    }
}
