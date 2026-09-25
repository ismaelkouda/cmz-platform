import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import {
    createActionRequestContext,
    SETTINGS_API_URL,
    type ActionRequestRequestPolicy,
} from '@cmz/core';
import { InvalidPayloadError } from '@cmz/shared-domain';
import { map, type Observable } from 'rxjs';

import { decodeCreateUserResponse } from './create-user.decoder';
import type {
    CreateUserInput,
    CreateUserRequestWire,
    CreateUserResult,
} from './models';
import { validateCreateUserInput } from './validation';

const REQUEST_POLICY: ActionRequestRequestPolicy = {
    authentication: {
        mode: 'host',
    },
};

function joinUrl(baseUrl: string, path: string): string {
    return [baseUrl.replace(/\/$/, ''), path.replace(/^\//, '')].join('/');
}

@Service({ autoProvided: false })
export class CreateUserSource {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(SETTINGS_API_URL);

    execute(input: CreateUserInput): Observable<CreateUserResult> {
        const validated = validateCreateUserInput(input);
        const body: CreateUserRequestWire = {
            first_name: validated['firstName'],
            last_name: validated['lastName'],
            email: validated['email'],
            phone: validated['phone'],
            profile_id: validated['profileId'],
        };
        return this.http
            .request<unknown>(
                'POST',
                joinUrl(this.baseUrl, '/settings-and-security/users/store'),
                {
                    body,
                    context: createActionRequestContext(REQUEST_POLICY),
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                    observe: 'response',
                }
            )
            .pipe(
                map((response) => {
                    if (response.status !== 200) {
                        throw new InvalidPayloadError('$.status', 'HTTP 200');
                    }
                    return decodeCreateUserResponse(response.body);
                })
            );
    }
}
