export class InvalidPayloadError extends Error {
    readonly code = 'INVALID_PAYLOAD';

    constructor(
        readonly path: string,
        readonly expected: string
    ) {
        super(`Invalid payload at ${path}: expected ${expected}`);
        this.name = 'InvalidPayloadError';
    }
}

export class ServerResponseError extends Error {
    readonly code = 'SERVER_RESPONSE_ERROR';

    constructor(readonly serverMessage: string) {
        super(serverMessage || 'ERRORS.HTTP.SERVER_ERROR');
        this.name = 'ServerResponseError';
    }
}
