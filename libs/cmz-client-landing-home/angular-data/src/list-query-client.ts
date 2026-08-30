import {
    HttpClient,
    HttpContext,
    HttpContextToken,
} from '@angular/common/http';
import { InjectionToken, Service, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { HomeBlockInfo } from '@cmz/cmz-client-landing-home-domain';

export const LIST_QUERY_BASE_URL = new InjectionToken<string>(
    'LIST_QUERY_BASE_URL'
);
export const PUBLIC_REQUEST = new HttpContextToken<boolean>(() => false);

export interface ResponseEnvelope<T> {
    readonly error: boolean;
    readonly message: string;
    readonly statusCode?: number;
    readonly data?: T | null;
}

export class ResponseEnvelopeError extends Error {
    readonly code = 'response_envelope_error';
    readonly statusCode?: number;

    constructor(message: string, statusCode?: number) {
        super(message);
        this.name = 'ResponseEnvelopeError';
        this.statusCode = statusCode;
    }
}

export class ResponseEnvelopeIntegrityError extends Error {
    readonly code = 'response_envelope_integrity_error';

    constructor() {
        super('Response envelope is missing its data payload');
        this.name = 'ResponseEnvelopeIntegrityError';
    }
}

function unwrapResponseEnvelope<T>(envelope: ResponseEnvelope<T>): T {
    if (envelope.error) {
        throw new ResponseEnvelopeError(envelope.message, envelope.statusCode);
    }
    if (envelope.data === undefined || envelope.data === null) {
        throw new ResponseEnvelopeIntegrityError();
    }
    return envelope.data;
}

function joinUrl(baseUrl: string, path: string): string {
    return [baseUrl.replace(/\/$/, ''), path.replace(/^\//, '')].join('/');
}

// autoProvided:false — même doctrine que ListQueryClient standalone
// (renderers/angular-list-query-renderer.mjs) et ActionRequestClient
// (renderers/angular-nx-layered-renderer.mjs).
@Service({ autoProvided: false })
export class ListQueryClient {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(LIST_QUERY_BASE_URL);

    listHomeBlockInfos(): Observable<HomeBlockInfo[]> {
        return this.http
            .get<ResponseEnvelope<HomeBlockInfo[]>>(
                joinUrl(this.baseUrl, 'cms/home-block-infos/actives/pwa'),
                {
                    context: new HttpContext().set(PUBLIC_REQUEST, true),
                }
            )
            .pipe(map(unwrapResponseEnvelope));
    }
}
