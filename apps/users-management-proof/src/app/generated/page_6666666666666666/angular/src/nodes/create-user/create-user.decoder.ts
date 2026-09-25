import { InvalidPayloadError, ServerResponseError } from '@cmz/shared-domain';

import type { CreateUserResult, MessageResponseWire } from './models';

function invalid(path: string, expected: string): never {
    throw new InvalidPayloadError(path, expected);
}

function asRecord(
    value: unknown,
    path: string
): Readonly<Record<string, unknown>> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        invalid(path, 'object');
    }
    return value as Readonly<Record<string, unknown>>;
}

const WIRE_FIELDS = new Set(['error', 'message']);
const ENVELOPE_FIELDS = new Set(['error', 'message']);

function decodeWire(value: unknown): MessageResponseWire {
    const record = asRecord(value, '$');
    for (const key of Object.keys(record)) {
        if (!WIRE_FIELDS.has(key)) invalid('$.' + key, 'declared field');
    }
    const value0 = record['error'];
    if (typeof value0 !== 'boolean') invalid('$.error', 'boolean');
    const value1 = record['message'];
    if (typeof value1 !== 'string') invalid('$.message', 'string');
    return {
        error: value0,
        message: value1,
    };
}

export function decodeCreateUserResponse(payload: unknown): CreateUserResult {
    const envelope = asRecord(payload, '$');
    for (const key of Object.keys(envelope)) {
        if (!ENVELOPE_FIELDS.has(key))
            invalid('$.' + key, 'declared envelope field');
    }
    const error = envelope['error'];
    const message = envelope['message'];
    if (typeof error !== 'boolean') invalid('$.error', 'boolean');
    if (typeof message !== 'string') invalid('$.message', 'string');
    if (error) throw new ServerResponseError(message);
    const wire = decodeWire(envelope);
    return {
        message: wire['message'],
    };
}
