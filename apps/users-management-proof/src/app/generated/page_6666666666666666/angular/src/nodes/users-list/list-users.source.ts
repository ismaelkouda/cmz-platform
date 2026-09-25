import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import {
    createListQueryRequestContext,
    SETTINGS_API_URL,
    type ListQueryRequestPolicy,
} from '@cmz/core';
import { InvalidPayloadError } from '@cmz/shared-domain';
import { map, type Observable } from 'rxjs';

import { decodeListUsersResponse } from './list-users.decoder';
import type { ListUsersInput, ListUsersPage } from './models';

const REQUEST_POLICY: ListQueryRequestPolicy = {
    authentication: {
        mode: 'host',
    },
    cache: {
        mode: 'host',
        scope: 'principal',
        refresh: 'bypass',
    },
};

function joinUrl(baseUrl: string, path: string): string {
    return [baseUrl.replace(/\/$/, ''), path.replace(/^\//, '')].join('/');
}

function invalidInput(path: string, expected: string): never {
    throw new InvalidPayloadError(path, expected);
}

function requestParams(input: ListUsersInput): HttpParams {
    let params = new HttpParams();
    const parameter0 = input['page'];
    if (parameter0 === undefined) invalidInput('$.page', 'required');
    if (typeof parameter0 !== 'number' || !Number.isInteger(parameter0))
        invalidInput('$.page', 'integer');
    if (parameter0 < 1) invalidInput('$.page', 'minimum 1');
    params = params.set('page', String(parameter0));
    const parameter1 = input['search'];
    if (parameter1 !== undefined) {
        if (typeof parameter1 !== 'string') invalidInput('$.search', 'string');
        if (parameter1.length < 1) invalidInput('$.search', 'min length 1');
        params = params.set('search', String(parameter1));
    }
    const parameter2 = input['profile'];
    if (parameter2 !== undefined) {
        if (typeof parameter2 !== 'string') invalidInput('$.profile', 'string');
        if (parameter2.length < 1) invalidInput('$.profile', 'min length 1');
        params = params.set('profile', String(parameter2));
    }
    const parameter3 = input['role'];
    if (parameter3 !== undefined) {
        if (typeof parameter3 !== 'string') invalidInput('$.role', 'string');
        if (!new RegExp('^(supervisor|team-leader|agent)$').test(parameter3))
            invalidInput('$.role', 'declared pattern');
        params = params.set('role', String(parameter3));
    }
    const parameter4 = input['isActive'];
    if (parameter4 !== undefined) {
        if (typeof parameter4 !== 'boolean')
            invalidInput('$.isActive', 'boolean');
        params = params.set('is_active', String(parameter4));
    }
    return params;
}

@Service({ autoProvided: false })
export class ListUsersSource {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(SETTINGS_API_URL);

    readAll(
        input: ListUsersInput,
        isRefresh: boolean
    ): Observable<ListUsersPage> {
        const context = createListQueryRequestContext(REQUEST_POLICY, {
            isRefresh,
        });
        return this.http
            .get<unknown>(
                joinUrl(this.baseUrl, '/settings-and-security/users'),
                { context, params: requestParams(input) }
            )
            .pipe(map(decodeListUsersResponse));
    }
}
