/**
 * SEOS generate-reference-module — writeDiInfrastructure
 * Extrait mécanique du monolithe (plafond 800 l. CI).
 * Corps non-indenté volontairement : préserve les littéraux de templates.
 */

export function writeDiInfrastructure(ctx) {
    const {
        w,
        E,
        Cap,
        MODULE,
        MODULE_UPPER,
        ENTITY_UPPER,
        ModuleCap,
        FIELD_DEFS,
        FIELD_NAMES,
        REQUIRED_FIELDS,
        EXTRA_FILTERS,
        API_BASE,
        BASE,
        crudOps,
        toSnake,
        pascalCase,
        upperSnake,
    } = ctx;

    // ---------------------------------------------------------------------
    // DI providers — {entity}Providers (Provider[]), modele reel infrastructure.providers.ts
    // ---------------------------------------------------------------------

    w(
        `di/${E}/${E}.providers.ts`,
        `
import { Provider } from '@angular/core';
import { ${Cap}Repository } from '${BASE}/domain/repositories/${E}/${E}.repository';
import { ${Cap}RepositoryImpl } from '${BASE}/infrastructure/data/repositories/${E}/${E}.repository.impl';

export const ${E}Providers: Provider[] = [
    {
        provide: ${Cap}Repository,
        useClass: ${Cap}RepositoryImpl,
    },
];
`
    );
    w(
        `di/${E}/${E}-select.providers.ts`,
        `
import { Provider } from '@angular/core';
import { ${Cap}SelectRepository } from '${BASE}/domain/repositories/${E}/${E}-select.repository';
import { ${Cap}SelectRepositoryImpl } from '${BASE}/infrastructure/data/repositories/${E}/${E}-select.repository.impl';

export const ${E}SelectProviders: Provider[] = [
    {
        provide: ${Cap}SelectRepository,
        useClass: ${Cap}SelectRepositoryImpl,
    },
];
`
    );
    w(
        `di/${E}/${E}-find-one.providers.ts`,
        `
import { Provider } from '@angular/core';
import { ${Cap}FindOneRepository } from '${BASE}/domain/repositories/${E}/${E}-find-one.repository';
import { ${Cap}FindOneRepositoryImpl } from '${BASE}/infrastructure/data/repositories/${E}/${E}-find-one.repository.impl';

export const ${E}FindOneProviders: Provider[] = [
    {
        provide: ${Cap}FindOneRepository,
        useClass: ${Cap}FindOneRepositoryImpl,
    },
];
`
    );

    // di/{MODULE}.providers.ts — fichier RACINE du module (pas sous di/{ENTITY}/), qui
    // agregue les Providers de chaque entite en un seul export provide{Module}. Modele
    // exact : di/administrative-infrastructure.providers.ts -> provideAdministrativeInfrastructure,
    // cable dans src/presentation/app.config.ts (verifie non mort). Ce generateur ne
    // produit qu'une seule entite synthetique, donc l'agregat ne porte qu'un seul groupe de
    // 3 providers — fidele au PATRON (fichier racine qui agrege), pas a la cardinalite du
    // module reel (2 entites) que ce generateur n'a jamais pretendu reproduire par ailleurs.
    w(
        `di/${MODULE}.providers.ts`,
        `
import { Provider } from '@angular/core';

import { ${E}FindOneProviders } from '${BASE}/di/${E}/${E}-find-one.providers';
import { ${E}SelectProviders } from '${BASE}/di/${E}/${E}-select.providers';
import { ${E}Providers } from '${BASE}/di/${E}/${E}.providers';

export const provide${ModuleCap} = (): Provider[] => [
    ...${E}Providers,
    ...${E}FindOneProviders,
    ...${E}SelectProviders,
];
`
    );

    // ---------------------------------------------------------------------
    // INFRASTRUCTURE — api dto (reponses enveloppees dans SimpleResponseDto/
    // PaginatedResponseDto — pas de tableau nu, incompatible avec ArrayResponseMapper)
    // ---------------------------------------------------------------------

    const apiFieldLines = FIELD_DEFS.map((f) => {
        const opt = f.required ? '' : '?';
        return `    ${toSnake(f.name)}${opt}: string;`;
    }).join('\n');
    const apiFieldLinesAllRequired = FIELD_NAMES.map(
        (f) => `    ${toSnake(f)}: string;`
    ).join('\n');
    const apiFilterExtra = EXTRA_FILTERS.map(
        (f) => `    ${toSnake(f)}?: string;`
    ).join('\n');
    const apiKinds = [
        'create',
        'update',
        'delete',
        'filter',
        'find-one-filter',
    ];
    for (const kind of apiKinds) {
        const Kind = kind.replace(/(^|-)([a-z])/g, (_, __, c) =>
            c.toUpperCase()
        );
        let body = '';
        if (kind === 'create') body = apiFieldLines;
        if (kind === 'update') body = `    id: string;\n${apiFieldLines}`;
        if (kind === 'delete') body = '    uniq_id: string;';
        if (kind === 'filter')
            body = `    search?: string;\n${apiFilterExtra ? apiFilterExtra + '\n' : ''}    start_date?: Date;\n    end_date?: Date;`;
        if (kind === 'find-one-filter') body = '    id: string;';
        w(
            `infrastructure/api/dto/${E}/${E}-${kind}-api.dto.ts`,
            `
export interface ${Cap}${Kind}ApiDto {
${body}
}
`
        );
    }

    w(
        `infrastructure/api/dto/${E}/${E}-response-api.dto.ts`,
        `
import { PaginatedResponseDto } from '@shared/data/dto/simple-response.dto';

export interface ${Cap}ItemApiDto {
    id: string;
${apiFieldLinesAllRequired}
    created_at: string;
    updated_at: string;
}

export type ${Cap}ResponseApiDto = PaginatedResponseDto<${Cap}ItemApiDto>;
`
    );

    w(
        `infrastructure/api/dto/${E}/${E}-find-one-response-api.dto.ts`,
        `
import { SimpleResponseDto } from '@shared/data/dto/simple-response.dto';

export interface ${Cap}FindOneItemApiDto {
    id: string;
${apiFieldLinesAllRequired}
    updated_at: string;
}

export type ${Cap}FindOneResponseApiDto = SimpleResponseDto<${Cap}FindOneItemApiDto>;
`
    );

    // select-response-api.dto.ts : enveloppe dans SimpleResponseDto<T[]> — modele reel
    // infrastructure-select-response-api.dto.ts (Experience 029/030), pas un tableau nu comme
    // le faisait l'ancienne version de ce generateur (incompatible avec ArrayResponseMapper,
    // qui attend un ArrayResponseDto<T> enveloppe).
    w(
        `infrastructure/api/dto/${E}/${E}-select-response-api.dto.ts`,
        `
import { SimpleResponseDto } from '@shared/data/dto/simple-response.dto';

export interface ${Cap}SelectItemApiDto {
    id: string;
    name: string;
}

export type ${Cap}SelectResponseApiDto = SimpleResponseDto<
    ${Cap}SelectItemApiDto[]
>;
`
    );

    // ---------------------------------------------------------------------
    // INFRASTRUCTURE — data/mappers (classes @Injectable, cache + .with() pour main/find-one,
    // SANS cache pour select — Experience 033/034)
    // ---------------------------------------------------------------------

    for (const { kind } of crudOps) {
        const Kind = kind[0].toUpperCase() + kind.slice(1);
        w(
            `infrastructure/data/mappers/${E}/${E}-${kind}.mapper.ts`,
            `
import { ${Cap}${Kind}ValidateContract } from '${BASE}/domain/contracts/${E}/${E}-${kind}.validate-contract';
import { ${Cap}${Kind}ApiDto } from '${BASE}/infrastructure/api/dto/${E}/${E}-${kind}-api.dto';

export function ${E}${Kind}Mapper(validContract: ${Cap}${Kind}ValidateContract): ${Cap}${Kind}ApiDto {
    return {
        ${kind === 'update' ? 'id: validContract.uniqId,\n        ' : ''}${FIELD_NAMES.map((f) => `${toSnake(f)}: validContract.${f}`).join(',\n        ')}
    };
}
`
        );
    }

    w(
        `infrastructure/data/mappers/${E}/${E}-delete.mapper.ts`,
        `
import { ${Cap}DeleteValidateContract } from '${BASE}/domain/contracts/${E}/${E}-delete.validate-contract';
import { ${Cap}DeleteApiDto } from '${BASE}/infrastructure/api/dto/${E}/${E}-delete-api.dto';

export function ${E}DeleteMapper(validContract: ${Cap}DeleteValidateContract): ${Cap}DeleteApiDto {
    return { uniq_id: validContract.uniqId };
}
`
    );

    w(
        `infrastructure/data/mappers/${E}/${E}-filter.mapper.ts`,
        `
import { ${Cap}FilterContract } from '${BASE}/domain/contracts/${E}/${E}-filter.contract';
import { ${Cap}FilterApiDto } from '${BASE}/infrastructure/api/dto/${E}/${E}-filter-api.dto';

export function ${E}FilterMapper(validContract: ${Cap}FilterContract): ${Cap}FilterApiDto {
    const params: ${Cap}FilterApiDto = {};
    if (validContract.search) {
        params.search = validContract.search;
    }
${EXTRA_FILTERS.map(
    (f) => `    if (validContract.${f}) {
        params.${toSnake(f)} = validContract.${f};
    }`
).join('\n')}
    if (validContract.startDate) {
        params.start_date = validContract.startDate;
    }
    if (validContract.endDate) {
        params.end_date = validContract.endDate;
    }
    return params;
}
`
    );

    w(
        `infrastructure/data/mappers/${E}/${E}-find-one-filter.mapper.ts`,
        `
import { ${Cap}FindOneFilterValidateContract } from '${BASE}/domain/contracts/${E}/${E}-find-one-filter.validate-contract';
import { ${Cap}FindOneFilterApiDto } from '${BASE}/infrastructure/api/dto/${E}/${E}-find-one-filter-api.dto';

export function ${E}FindOneFilterMapper(validContract: ${Cap}FindOneFilterValidateContract): ${Cap}FindOneFilterApiDto {
    return { id: validContract.uniqId };
}
`
    );

    w(
        `infrastructure/data/mappers/${E}/${E}.mapper.ts`,
        `
import { Injectable } from '@angular/core';
import { ${Cap}Entity } from '${BASE}/domain/entities/${E}/${E}.entity';
import { ${Cap}Props } from '${BASE}/domain/interfaces/${E}/${E}-props.interface';
import { ${Cap}ItemApiDto } from '${BASE}/infrastructure/api/dto/${E}/${E}-response-api.dto';
import { PaginatedMapper } from '@shared/data/mappers/base/paginated-response.mapper';
import { MapperUtils } from '@shared/domain/utils/mapper-utils';

@Injectable({
    providedIn: 'root',
})
export class ${Cap}Mapper extends PaginatedMapper<${Cap}Entity, ${Cap}ItemApiDto> {
    private readonly entityCache = new Map<string, ${Cap}Entity>();

    protected mapItemFromDto(dto: ${Cap}ItemApiDto): ${Cap}Entity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: ${Cap}Props = {
            uniqId: dto.id,
${FIELD_NAMES.map((f) => `            ${f}: dto.${toSnake(f)},`).join('\n')}
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };

        const cacheKey = \`dto:\${dto.id}\`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached ? cached.with(props) : new ${Cap}Entity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
`
    );

    w(
        `infrastructure/data/mappers/${E}/${E}-find-one.mapper.ts`,
        `
import { Injectable } from '@angular/core';
import { ${Cap}FindOneEntity } from '${BASE}/domain/entities/${E}/${E}-find-one.entity';
import { ${Cap}FindOneProps } from '${BASE}/domain/interfaces/${E}/${E}-find-one-props.interface';
import { ${Cap}FindOneItemApiDto } from '${BASE}/infrastructure/api/dto/${E}/${E}-find-one-response-api.dto';
import { SimpleResponseMapper } from '@shared/data/mappers/base/simple-response.mapper';
import { MapperUtils } from '@shared/domain/utils/mapper-utils';

@Injectable({
    providedIn: 'root',
})
export class ${Cap}FindOneMapper extends SimpleResponseMapper<${Cap}FindOneEntity, ${Cap}FindOneItemApiDto> {
    private readonly entityCache = new Map<string, ${Cap}FindOneEntity>();

    protected mapItemFromDto(dto: ${Cap}FindOneItemApiDto): ${Cap}FindOneEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: ${Cap}FindOneProps = {
            uniqId: dto.id,
${FIELD_NAMES.map((f) => `            ${f}: dto.${toSnake(f)},`).join('\n')}
            updatedAt: dto.updated_at,
        };

        const cacheKey = \`dto:\${dto.id}\`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached ? cached.with(props) : new ${Cap}FindOneEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
`
    );

    // select.mapper.ts : SANS cache d'entites — modele infrastructure-select.mapper.ts
    // simplifie recemment (Experience 033/034) ; l'ancien cache etait un Map jamais purge
    // dans un service singleton, un risque de fuite memoire latent, pas une optimisation
    // necessaire pour un select (pas de besoin de referentialite d'update in-place).
    w(
        `infrastructure/data/mappers/${E}/${E}-select.mapper.ts`,
        `
import { Injectable } from '@angular/core';
import { ${Cap}SelectItemApiDto } from '${BASE}/infrastructure/api/dto/${E}/${E}-select-response-api.dto';
import { ArrayResponseMapper } from '@shared/data/mappers/base/array-response.mapper';
import { SelectOption } from '@shared/domain/interfaces/select-option.interface';
import { MapperUtils } from '@shared/domain/utils/mapper-utils';

@Injectable({
    providedIn: 'root',
})
export class ${Cap}SelectMapper extends ArrayResponseMapper<SelectOption, ${Cap}SelectItemApiDto> {
    protected mapItemFromDto(dto: ${Cap}SelectItemApiDto): SelectOption {
        MapperUtils.validateDto(dto, { required: ['id'] });
        return {
            label: dto.name,
            value: dto.id,
        };
    }
}
`
    );

    // ---------------------------------------------------------------------
    // INFRASTRUCTURE — endpoints + data/sources (api), SETTINGS_API_URL injecte
    // ---------------------------------------------------------------------

    w(
        `infrastructure/api/${MODULE}.endpoints.ts`,
        `
export const ${MODULE_UPPER.replace(/-/g, '_')}_ENDPOINTS = {
    ${ENTITY_UPPER}: '${API_BASE.replace(/^\//, '')}',
} as const;
`
    );

    w(
        `infrastructure/data/sources/${E}/${E}.api.ts`,
        `
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BYPASS_CACHE } from '@core/interceptors/cache-context.token';
import { SETTINGS_API_URL } from '@core/config/config.tokens';
import { ${Cap}CreateApiDto } from '${BASE}/infrastructure/api/dto/${E}/${E}-create-api.dto';
import { ${Cap}DeleteApiDto } from '${BASE}/infrastructure/api/dto/${E}/${E}-delete-api.dto';
import { ${Cap}FilterApiDto } from '${BASE}/infrastructure/api/dto/${E}/${E}-filter-api.dto';
import { ${Cap}ResponseApiDto } from '${BASE}/infrastructure/api/dto/${E}/${E}-response-api.dto';
import { ${Cap}UpdateApiDto } from '${BASE}/infrastructure/api/dto/${E}/${E}-update-api.dto';
import { ${MODULE_UPPER.replace(/-/g, '_')}_ENDPOINTS } from '${BASE}/infrastructure/api/${MODULE}.endpoints';
import { MessageResponseDto } from '@shared/data/dto/simple-response.dto';
import { buildHttpParams } from '@shared/domain/utils/build-http-params.utils';
import { buildHttpPayload } from '@shared/domain/utils/build-http-payload.util';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ${Cap}Api {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        dto: ${Cap}FilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<${Cap}ResponseApiDto> {
        const url = \`\${this.baseUrl}\${${MODULE_UPPER.replace(/-/g, '_')}_ENDPOINTS.${ENTITY_UPPER}}?page=\${page}\`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(BYPASS_CACHE, options?.forceRefresh ?? false);
        return this.http.get<${Cap}ResponseApiDto>(url, { params, context });
    }

    create(apiDto: ${Cap}CreateApiDto): Observable<MessageResponseDto> {
        const url = \`\${this.baseUrl}\${${MODULE_UPPER.replace(/-/g, '_')}_ENDPOINTS.${ENTITY_UPPER}}/store\`;
        const payload = buildHttpPayload(apiDto, []);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    update(apiDto: ${Cap}UpdateApiDto): Observable<MessageResponseDto> {
        const url = \`\${this.baseUrl}\${${MODULE_UPPER.replace(/-/g, '_')}_ENDPOINTS.${ENTITY_UPPER}}/\${apiDto.id}/update\`;
        const payload = buildHttpPayload(apiDto, ['id']);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    delete(apiDto: ${Cap}DeleteApiDto): Observable<MessageResponseDto> {
        const url = \`\${this.baseUrl}\${${MODULE_UPPER.replace(/-/g, '_')}_ENDPOINTS.${ENTITY_UPPER}}/\${apiDto.uniq_id}/delete\`;
        return this.http.delete<MessageResponseDto>(url);
    }
}
`
    );

    w(
        `infrastructure/data/sources/${E}/${E}-find-one.api.ts`,
        `
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BYPASS_CACHE } from '@core/interceptors/cache-context.token';
import { SETTINGS_API_URL } from '@core/config/config.tokens';
import { ${Cap}FindOneFilterApiDto } from '${BASE}/infrastructure/api/dto/${E}/${E}-find-one-filter-api.dto';
import { ${Cap}FindOneResponseApiDto } from '${BASE}/infrastructure/api/dto/${E}/${E}-find-one-response-api.dto';
import { ${MODULE_UPPER.replace(/-/g, '_')}_ENDPOINTS } from '${BASE}/infrastructure/api/${MODULE}.endpoints';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ${Cap}FindOneApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    execute(
        dto?: ${Cap}FindOneFilterApiDto,
        options?: FetchOptions
    ): Observable<${Cap}FindOneResponseApiDto> {
        const params = dto?.id ? \`/\${dto.id}\` : '';
        const url = \`\${this.baseUrl}\${${MODULE_UPPER.replace(/-/g, '_')}_ENDPOINTS.${ENTITY_UPPER}}\${params}\`;
        const context = new HttpContext().set(BYPASS_CACHE, options?.forceRefresh ?? false);
        return this.http.get<${Cap}FindOneResponseApiDto>(url, { context });
    }
}
`
    );

    w(
        `infrastructure/data/sources/${E}/${E}-select.api.ts`,
        `
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BYPASS_CACHE } from '@core/interceptors/cache-context.token';
import { SETTINGS_API_URL } from '@core/config/config.tokens';
import { ${Cap}SelectResponseApiDto } from '${BASE}/infrastructure/api/dto/${E}/${E}-select-response-api.dto';
import { ${MODULE_UPPER.replace(/-/g, '_')}_ENDPOINTS } from '${BASE}/infrastructure/api/${MODULE}.endpoints';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ${Cap}SelectApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(options?: FetchOptions): Observable<${Cap}SelectResponseApiDto> {
        const url = \`\${this.baseUrl}\${${MODULE_UPPER.replace(/-/g, '_')}_ENDPOINTS.${ENTITY_UPPER}}\`;
        const context = new HttpContext().set(BYPASS_CACHE, options?.forceRefresh ?? false);
        return this.http.get<${Cap}SelectResponseApiDto>(url, { context });
    }
}
`
    );

    // ---------------------------------------------------------------------
    // INFRASTRUCTURE — data/repositories (impl, convention POINT)
    // ---------------------------------------------------------------------

    w(
        `infrastructure/data/repositories/${E}/${E}.repository.impl.ts`,
        `
import { Injectable, inject } from '@angular/core';
import { ${Cap}CreateValidateContract } from '${BASE}/domain/contracts/${E}/${E}-create.validate-contract';
import { ${Cap}DeleteValidateContract } from '${BASE}/domain/contracts/${E}/${E}-delete.validate-contract';
import { ${Cap}FilterContract } from '${BASE}/domain/contracts/${E}/${E}-filter.contract';
import { ${Cap}UpdateValidateContract } from '${BASE}/domain/contracts/${E}/${E}-update.validate-contract';
import { ${Cap}Entity } from '${BASE}/domain/entities/${E}/${E}.entity';
import { ${Cap}Repository } from '${BASE}/domain/repositories/${E}/${E}.repository';
import { ${E}CreateMapper } from '${BASE}/infrastructure/data/mappers/${E}/${E}-create.mapper';
import { ${E}DeleteMapper } from '${BASE}/infrastructure/data/mappers/${E}/${E}-delete.mapper';
import { ${E}FilterMapper } from '${BASE}/infrastructure/data/mappers/${E}/${E}-filter.mapper';
import { ${E}UpdateMapper } from '${BASE}/infrastructure/data/mappers/${E}/${E}-update.mapper';
import { ${Cap}Mapper } from '${BASE}/infrastructure/data/mappers/${E}/${E}.mapper';
import { ${Cap}Api } from '${BASE}/infrastructure/data/sources/${E}/${E}.api';
import {
    MessageResponseDto,
    Paginate,
} from '@shared/data/dto/simple-response.dto';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable, map } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ${Cap}RepositoryImpl implements ${Cap}Repository {
    private readonly api = inject(${Cap}Api);
    private readonly mapper = inject(${Cap}Mapper);

    execute(
        validContract: ${Cap}FilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<Paginate<${Cap}Entity>> {
        return this.api
            .readAll(${E}FilterMapper(validContract), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(
        validContract: ${Cap}CreateValidateContract
    ): Observable<MessageResponseDto> {
        return this.api.create(${E}CreateMapper(validContract));
    }

    update(
        validContract: ${Cap}UpdateValidateContract
    ): Observable<MessageResponseDto> {
        return this.api.update(${E}UpdateMapper(validContract));
    }

    delete(
        validContract: ${Cap}DeleteValidateContract
    ): Observable<MessageResponseDto> {
        return this.api.delete(${E}DeleteMapper(validContract));
    }
}
`
    );

    w(
        `infrastructure/data/repositories/${E}/${E}-find-one.repository.impl.ts`,
        `
import { Injectable, inject } from '@angular/core';
import { ${Cap}FindOneFilterValidateContract } from '${BASE}/domain/contracts/${E}/${E}-find-one-filter.validate-contract';
import { ${Cap}FindOneEntity } from '${BASE}/domain/entities/${E}/${E}-find-one.entity';
import { ${Cap}FindOneRepository } from '${BASE}/domain/repositories/${E}/${E}-find-one.repository';
import { ${E}FindOneFilterMapper } from '${BASE}/infrastructure/data/mappers/${E}/${E}-find-one-filter.mapper';
import { ${Cap}FindOneMapper } from '${BASE}/infrastructure/data/mappers/${E}/${E}-find-one.mapper';
import { ${Cap}FindOneApi } from '${BASE}/infrastructure/data/sources/${E}/${E}-find-one.api';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable, map } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ${Cap}FindOneRepositoryImpl implements ${Cap}FindOneRepository {
    private readonly api = inject(${Cap}FindOneApi);
    private readonly mapper = inject(${Cap}FindOneMapper);

    execute(
        validContract: ${Cap}FindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<${Cap}FindOneEntity> {
        const dto = ${E}FindOneFilterMapper(validContract);
        return this.api.execute(dto, options).pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
`
    );

    w(
        `infrastructure/data/repositories/${E}/${E}-select.repository.impl.ts`,
        `
import { Injectable, inject } from '@angular/core';
import { ${Cap}SelectRepository } from '${BASE}/domain/repositories/${E}/${E}-select.repository';
import { ${Cap}SelectMapper } from '${BASE}/infrastructure/data/mappers/${E}/${E}-select.mapper';
import { ${Cap}SelectApi } from '${BASE}/infrastructure/data/sources/${E}/${E}-select.api';
import { SelectOption } from '@shared/domain/interfaces/select-option.interface';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable, map } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ${Cap}SelectRepositoryImpl implements ${Cap}SelectRepository {
    private readonly api = inject(${Cap}SelectApi);
    private readonly mapper = inject(${Cap}SelectMapper);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return this.api.readAll(options).pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
`
    );
}
