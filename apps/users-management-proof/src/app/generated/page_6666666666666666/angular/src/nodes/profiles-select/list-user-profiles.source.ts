import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import {
    createListQueryRequestContext,
    SETTINGS_API_URL,
    type ListQueryRequestPolicy,
} from '@cmz/core';
import { map, type Observable } from 'rxjs';

import { decodeListUserProfilesResponse } from './list-user-profiles.decoder';
import type { ProfileOption } from './models';

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

@Service({ autoProvided: false })
export class ListUserProfilesSource {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(SETTINGS_API_URL);

    readAll(isRefresh: boolean): Observable<readonly ProfileOption[]> {
        const context = createListQueryRequestContext(REQUEST_POLICY, {
            isRefresh,
        });
        return this.http
            .get<unknown>(
                joinUrl(
                    this.baseUrl,
                    '/settings-and-security/user-profiles/select-field'
                ),
                { context }
            )
            .pipe(map(decodeListUserProfilesResponse));
    }
}
