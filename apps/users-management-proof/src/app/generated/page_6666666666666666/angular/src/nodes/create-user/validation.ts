import { InvalidPayloadError } from '@cmz/shared-domain';

import type { CreateUserInput } from './models';

function invalid(path: string, expected: string): never {
    throw new InvalidPayloadError(path, expected);
}

const INPUT_FIELDS = new Set([
    'firstName',
    'lastName',
    'email',
    'phone',
    'profileId',
]);

export function validateCreateUserInput(input: unknown): CreateUserInput {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        invalid('$', 'object');
    }
    const record = input as Readonly<Record<string, unknown>>;
    for (const key of Object.keys(record)) {
        if (!INPUT_FIELDS.has(key)) invalid('$.' + key, 'declared field');
    }
    const value0 = record['firstName'];
    if (typeof value0 !== 'string' || value0.trim().length === 0)
        invalid('$.firstName', 'non-empty string');
    const value1 = record['lastName'];
    if (typeof value1 !== 'string' || value1.trim().length === 0)
        invalid('$.lastName', 'non-empty string');
    const value2 = record['email'];
    if (typeof value2 !== 'string' || value2.trim().length === 0)
        invalid('$.email', 'non-empty string');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value2)) invalid('$.email', 'email');
    const value3 = record['phone'];
    if (typeof value3 !== 'string' || value3.trim().length === 0)
        invalid('$.phone', 'non-empty string');
    const value4 = record['profileId'];
    if (typeof value4 !== 'string' || value4.trim().length === 0)
        invalid('$.profileId', 'non-empty string');
    return {
        firstName: value0,
        lastName: value1,
        email: value2,
        phone: value3,
        profileId: value4,
    };
}
