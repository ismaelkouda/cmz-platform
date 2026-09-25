import { InvalidPayloadError, ServerResponseError } from '@cmz/shared-domain';

import type { ListUsersPage, UserListItem, UsersListItemWire } from './models';

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
    const path = `${basePath}.id`;
    const value = record['id'];
    if (value === undefined) invalid(path, 'string');
    if (value === null) invalid(path, 'string');
    if (!(typeof value === 'string')) invalid(path, 'string');

    return value;
}

function decodeField1(
    record: Readonly<Record<string, unknown>>,
    basePath: string
): string {
    const path = `${basePath}.first_name`;
    const value = record['first_name'];
    if (value === undefined) invalid(path, 'string');
    if (value === null) invalid(path, 'string');
    if (!(typeof value === 'string')) invalid(path, 'string');

    return value;
}

function decodeField2(
    record: Readonly<Record<string, unknown>>,
    basePath: string
): string {
    const path = `${basePath}.last_name`;
    const value = record['last_name'];
    if (value === undefined) invalid(path, 'string');
    if (value === null) invalid(path, 'string');
    if (!(typeof value === 'string')) invalid(path, 'string');

    return value;
}

function decodeField3(
    record: Readonly<Record<string, unknown>>,
    basePath: string
): string {
    const path = `${basePath}.email`;
    const value = record['email'];
    if (value === undefined) invalid(path, 'string');
    if (value === null) invalid(path, 'string');
    if (!(typeof value === 'string')) invalid(path, 'string');

    return value;
}

function decodeField4(
    record: Readonly<Record<string, unknown>>,
    basePath: string
): string {
    const path = `${basePath}.phone`;
    const value = record['phone'];
    if (value === undefined) invalid(path, 'string');
    if (value === null) invalid(path, 'string');
    if (!(typeof value === 'string')) invalid(path, 'string');

    return value;
}

function decodeField5(
    record: Readonly<Record<string, unknown>>,
    basePath: string
): string {
    const path = `${basePath}.profile`;
    const value = record['profile'];
    if (value === undefined) invalid(path, 'string');
    if (value === null) invalid(path, 'string');
    if (!(typeof value === 'string')) invalid(path, 'string');

    return value;
}

function decodeField6(
    record: Readonly<Record<string, unknown>>,
    basePath: string
): string | null {
    const path = `${basePath}.role`;
    const value = record['role'];
    if (value === undefined) invalid(path, 'string');
    if (value === null) return null;
    if (!(typeof value === 'string')) invalid(path, 'string');
    if (
        !['supervisor', 'team-leader', 'agent'].some((allowed) =>
            Object.is(allowed, value)
        )
    )
        invalid(path, 'declared value');
    return value;
}

function decodeField7(
    record: Readonly<Record<string, unknown>>,
    basePath: string
): string {
    const path = `${basePath}.status`;
    const value = record['status'];
    if (value === undefined) invalid(path, 'string');
    if (value === null) invalid(path, 'string');
    if (!(typeof value === 'string')) invalid(path, 'string');
    if (
        !['active', 'inactive', 'blocked', 'pending'].some((allowed) =>
            Object.is(allowed, value)
        )
    )
        invalid(path, 'declared value');
    return value;
}

function decodeField8(
    record: Readonly<Record<string, unknown>>,
    basePath: string
): string {
    const path = `${basePath}.created_at`;
    const value = record['created_at'];
    if (value === undefined) invalid(path, 'string');
    if (value === null) invalid(path, 'string');
    if (!(typeof value === 'string')) invalid(path, 'string');

    return value;
}

function decodeField9(
    record: Readonly<Record<string, unknown>>,
    basePath: string
): string {
    const path = `${basePath}.updated_at`;
    const value = record['updated_at'];
    if (value === undefined) invalid(path, 'string');
    if (value === null) invalid(path, 'string');
    if (!(typeof value === 'string')) invalid(path, 'string');

    return value;
}

const WIRE_FIELDS = new Set([
    'id',
    'first_name',
    'last_name',
    'email',
    'phone',
    'profile',
    'role',
    'status',
    'created_at',
    'updated_at',
]);

function decodeWireItem(value: unknown, index: number): UsersListItemWire {
    const path = '$.data.data' + `[${index}]`;
    const record = asRecord(value, path);
    for (const key of Object.keys(record)) {
        if (!WIRE_FIELDS.has(key)) invalid(`${path}.${key}`, 'declared field');
    }
    return {
        id: decodeField0(record, path),
        first_name: decodeField1(record, path),
        last_name: decodeField2(record, path),
        email: decodeField3(record, path),
        phone: decodeField4(record, path),
        profile: decodeField5(record, path),
        role: decodeField6(record, path),
        status: decodeField7(record, path),
        created_at: decodeField8(record, path),
        updated_at: decodeField9(record, path),
    };
}

function mapReadModel(wire: UsersListItemWire): UserListItem {
    return {
        uniqId: wire['id'],
        firstName: wire['first_name'],
        lastName: wire['last_name'],
        email: wire['email'],
        phone: wire['phone'],
        profile: wire['profile'],
        role: wire['role'],
        status: wire['status'],
        updatedAt: wire['updated_at'],
    };
}

export function decodeListUsersResponse(payload: unknown): ListUsersPage {
    const envelope = asRecord(payload, '$');
    const error = envelope['error'];
    const message = envelope['message'];
    if (typeof error !== 'boolean') invalid('$.error', 'boolean');
    if (typeof message !== 'string') invalid('$.message', 'string');
    if (error) throw new ServerResponseError(message);
    const result = envelope['data'];
    const page = asRecord(result, '$.data');
    const collection = page['data'];
    if (!Array.isArray(collection)) invalid('$.data.data', 'array');
    const pageField0 = page['current_page'];
    if (typeof pageField0 !== 'number' || !Number.isInteger(pageField0))
        invalid('$.data.current_page', 'integer');
    const pageField1 = page['last_page'];
    if (typeof pageField1 !== 'number' || !Number.isInteger(pageField1))
        invalid('$.data.last_page', 'integer');
    const pageField2 = page['per_page'];
    if (typeof pageField2 !== 'number' || !Number.isInteger(pageField2))
        invalid('$.data.per_page', 'integer');
    const pageField3 = page['total'];
    if (typeof pageField3 !== 'number' || !Number.isInteger(pageField3))
        invalid('$.data.total', 'integer');
    return {
        items: collection.map((item, index) =>
            mapReadModel(decodeWireItem(item, index))
        ),
        currentPage: pageField0,
        lastPage: pageField1,
        pageSize: pageField2,
        totalItems: pageField3,
    };
}
