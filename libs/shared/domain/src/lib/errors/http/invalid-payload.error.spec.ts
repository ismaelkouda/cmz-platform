import { describe, expect, it } from 'vitest';

import { DomainError } from '../domain-error.abstract';
import { InvalidPayloadError } from './invalid-payload.error';

describe('InvalidPayloadError', () => {
    it('reste identifiable dans la boucle d’erreur du host', () => {
        const error = new InvalidPayloadError('$.data[0].id', 'string');

        expect(error).toBeInstanceOf(DomainError);
        expect(error).toMatchObject({
            code: 'INVALID_PAYLOAD',
            messageKey: 'ERRORS.HTTP.INVALID_PAYLOAD',
            params: { path: '$.data[0].id', expected: 'string' },
        });
    });
});
