import { InvalidPayloadError, ServerResponseError } from '@cmz/shared-domain';

import type { ProfileOption, ProfileSelectWire } from './models';

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

function decodeField0(
    record: Readonly<Record<string, unknown>>,
    basePath: string
): string {
    const path = `${basePath}.uniq_id`;
    const value = record['uniq_id'];
    if (value === undefined) invalid(path, 'string');
    if (value === null) invalid(path, 'string');
    if (!(typeof value === 'string')) invalid(path, 'string');

    return value;
}

function decodeField1(
    record: Readonly<Record<string, unknown>>,
    basePath: string
): string {
    const path = `${basePath}.name`;
    const value = record['name'];
    if (value === undefined) invalid(path, 'string');
    if (value === null) invalid(path, 'string');
    if (!(typeof value === 'string')) invalid(path, 'string');

    return value;
}

const WIRE_FIELDS = new Set(['uniq_id', 'name']);

function decodeWireItem(value: unknown, index: number): ProfileSelectWire {
    const path = '$.data' + `[${index}]`;
    const record = asRecord(value, path);
    for (const key of Object.keys(record)) {
        if (!WIRE_FIELDS.has(key)) invalid(`${path}.${key}`, 'declared field');
    }
    return {
        uniq_id: decodeField0(record, path),
        name: decodeField1(record, path),
    };
}

function mapReadModel(wire: ProfileSelectWire): ProfileOption {
    return {
        value: wire['uniq_id'],
        label: wire['name'],
    };
}

export function decodeListUserProfilesResponse(
    payload: unknown
): readonly ProfileOption[] {
    const envelope = asRecord(payload, '$');
    const error = envelope['error'];
    const message = envelope['message'];
    if (typeof error !== 'boolean') invalid('$.error', 'boolean');
    if (typeof message !== 'string') invalid('$.message', 'string');
    if (error) throw new ServerResponseError(message);
    const result = envelope['data'];
    const collection = result;
    if (!Array.isArray(collection)) invalid('$.data', 'array');

    return collection.map((item, index) =>
        mapReadModel(decodeWireItem(item, index))
    );
}
