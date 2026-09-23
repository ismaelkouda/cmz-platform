import { pascalCase } from './shared.mjs';
import {
    LIST_QUERY_V2_SUPPORTED_PRIMITIVES,
    assertListQueryV2RendererModel,
    exactKeys,
    renderListQueryV2Decoder,
    renderListQueryV2Models,
    renderListQueryV2RequestPath,
} from './list-query-v2-renderer-shared.mjs';

function fail(message) {
    throw new Error(`angular list-query v2 renderer: ${message}`);
}

function renderSource(query, binding) {
    const className = `${pascalCase(query.id)}Source`;
    const decoderName = `decode${pascalCase(query.id)}Response`;
    const readName = pascalCase(query.read_model.id);
    const hasInput = query.port.input.kind === 'object';
    const inputName = `${pascalCase(query.id)}Input`;
    const modelImports = hasInput ? `${inputName}, ${readName}` : readName;
    const inputParameter = hasInput ? `input: ${inputName}, ` : '';
    const path = hasInput
        ? 'requestPath(input)'
        : JSON.stringify(query.transport.path);
    const requestPath = hasInput
        ? renderListQueryV2RequestPath(query, inputName)
        : '';
    const invalidPayloadImport = hasInput
        ? "import { InvalidPayloadError } from '@cmz/shared-domain';\n"
        : '';
    const policy = JSON.stringify(
        {
            authentication: {
                mode: query.request_policy.authentication.mode,
            },
            cache: query.request_policy.cache,
        },
        null,
        4
    );
    return `import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { createListQueryRequestContext, ${binding.token}, type ListQueryRequestPolicy } from '${binding.module}';
${invalidPayloadImport}import { map, type Observable } from 'rxjs';

import { ${decoderName} } from './${query.id}.decoder';
import type { ${modelImports} } from './models';

const REQUEST_POLICY: ListQueryRequestPolicy = ${policy};

function joinUrl(baseUrl: string, path: string): string {
    return [baseUrl.replace(/\\/$/, ''), path.replace(/^\\//, '')].join('/');
}

${requestPath}

@Service({ autoProvided: false })
export class ${className} {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(${binding.token});

    readAll(${inputParameter}isRefresh: boolean): Observable<readonly ${readName}[]> {
        const context = createListQueryRequestContext(REQUEST_POLICY, { isRefresh });
        return this.http
            .get<unknown>(joinUrl(this.baseUrl, ${path}), { context })
            .pipe(map(${decoderName}));
    }
}
`;
}

function renderFacade(query) {
    const className = `${pascalCase(query.id)}Facade`;
    const sourceName = `${pascalCase(query.id)}Source`;
    const readName = pascalCase(query.read_model.id);
    const hasInput = query.port.input.kind === 'object';
    const inputName = `${pascalCase(query.id)}Input`;
    const modelImports = hasInput ? `${inputName}, ${readName}` : readName;
    const queryInputField = hasInput
        ? `\n    readonly input: ${inputName};`
        : '';
    const sourceInput = hasInput ? 'params.input, ' : '';
    const loadInputParameter = hasInput ? `input: ${inputName}, ` : '';
    const loadInputValue = hasInput ? ' input,' : '';
    return `import { Service, computed, effect, inject, signal } from '@angular/core';
import { ResourceFacade, type ResourceStreamContext } from '@cmz/shared-application';
import { type Observable } from 'rxjs';

import { ${sourceName} } from './${query.id}.source';
import type { ${modelImports} } from './models';

interface LoadOptions {
    readonly forceRefresh?: boolean;
}

interface QueryParams {
    readonly forceRefresh: boolean;
${queryInputField}
}

export type ${pascalCase(query.id)}State = 'idle' | 'loading' | 'success' | 'empty' | 'error' | 'reloading';

@Service({ autoProvided: false })
export class ${className} extends ResourceFacade<readonly ${readName}[], QueryParams> {
    private readonly source = inject(${sourceName});
    private readonly lastResolvedItems = signal<readonly ${readName}[]>([]);

    readonly items = computed(
        () => this.value() ?? this.lastResolvedItems()
    );
    readonly state = computed<${pascalCase(query.id)}State>(() => {
        const status = this.status();
        if (status === 'resolved' || status === 'local') {
            return this.items().length === 0 ? 'empty' : 'success';
        }
        return status;
    });

    constructor() {
        super();
        effect(() => {
            const status = this.status();
            const value = this.value();
            if ((status === 'resolved' || status === 'local') && value) {
                this.lastResolvedItems.set(value);
            }
        });
    }

    protected stream(
        params: QueryParams,
        context: ResourceStreamContext
    ): Observable<readonly ${readName}[]> {
        const isRefresh =
            params.forceRefresh || context.previousStatus !== 'idle';
        return this.source.readAll(${sourceInput}isRefresh);
    }

    load(${loadInputParameter}options: LoadOptions = {}): void {
        this.setParams({${loadInputValue} forceRefresh: options.forceRefresh ?? false });
    }
}
`;
}

function validateInput(model, hostBindings) {
    const query = assertListQueryV2RendererModel(model, 'angular');
    if (!exactKeys(hostBindings, ['services'])) {
        fail('host bindings must use the closed services shape');
    }
    if (
        !hostBindings.services ||
        typeof hostBindings.services !== 'object' ||
        Array.isArray(hostBindings.services)
    ) {
        fail('host bindings services must be an object');
    }
    const binding = hostBindings.services[query.transport.service_id];
    if (!binding || !exactKeys(binding, ['module', 'token'])) {
        fail(`missing closed host binding for ${query.transport.service_id}`);
    }
    if (
        !/^[@A-Za-z0-9][@A-Za-z0-9._/-]*$/.test(binding.module) ||
        !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(binding.token)
    ) {
        fail(`unsafe host binding for ${query.transport.service_id}`);
    }
    return { query, binding };
}

export function renderAngularListQueryV2(model, hostBindings) {
    const { query, binding } = validateInput(model, hostBindings);
    const files = {
        'src/models.ts': renderListQueryV2Models(query, 'angular'),
        [`src/${query.id}.decoder.ts`]: renderListQueryV2Decoder(
            query,
            'angular'
        ),
        [`src/${query.id}.source.ts`]: renderSource(query, binding),
        [`src/${query.id}.facade.ts`]: renderFacade(query),
        'src/index.ts': `export * from './models';\nexport * from './${query.id}.decoder';\nexport * from './${query.id}.source';\nexport * from './${query.id}.facade';\n`,
    };
    return { files, queryId: query.id };
}

export const angularListQueryV2RendererInternals = {
    supportedPrimitives: LIST_QUERY_V2_SUPPORTED_PRIMITIVES,
};
