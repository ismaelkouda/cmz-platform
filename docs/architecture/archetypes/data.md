# Archétypes — couche `data`

Dépend de `{domain module, shared-data, shared-domain, core, @angular}`. Ne
dépend **jamais** de `application`/`ui`.

## `endpoints` (constante)

- **Rôle DDD/CQRS** : chemins API du module, un seul point de vérité.
- **Règle mécanique** : `as const`, une clé par ressource (pas par opération —
  `store`/`update`/`delete` sont des suffixes construits dans l'`api-source`).
- **Référence** : `endpoints/administrative-infrastructure.endpoints.ts`.

## `dto` (request + response)

- **Rôle DDD/CQRS** : forme exacte du wire — snake_case, tel que le serveur le
  parle. Aucune logique.
- **Règle mécanique** : réponse liste → `PaginatedResponseDto<XItemApiDto>`
  (`@cmz/shared-data`) ; réponse unitaire → `SimpleResponseDto<T>` ; relations
  entrantes = objets complets (`{id, name, code}` typé, pas juste `name`) —
  point de vigilance transversal (cf. décision « garder l'id »).
- **Squelette** :
    ```ts
    export interface XItemApiDto {
        id: string;
        /* champs snake_case */
        is_active: boolean;
        created_at: string;
        updated_at: string;
    }
    export type XResponseApiDto = PaginatedResponseDto<XItemApiDto>;
    ```
    ```ts
    export interface XCreateApiDto {
        champ_a: string;
        champ_b: string;
    }
    ```
- **Référence** : `dtos/infrastructure-type-response-api.dto.ts`,
  `dtos/infrastructure-type-create-api.dto.ts`.

## `mapper` — response (`@Service`, classe)

- **Rôle DDD/CQRS** : DTO réponse → entité domaine.
- **Règle mécanique** : étend `PaginatedMapper<XEntity, XItemApiDto>` (liste) ou
  `ArrayResponseMapper<T, Dto>` (select) ;
  `MapperUtils.validateDto(dto, {required:['id']})` en première ligne ; **cache
  par id** (`Map`) + réutilise `entity.with(props)` pour préserver l'identité
  `===` si rien n'a changé. Dérivation `status` :
  `dto.is_active ? Status.ACTIVE : Status.INACTIVE` (jamais `!!status`, toujours
  vrai si les deux valeurs sont truthy).
- **Squelette** :
    ```ts
    @Service()
    export class XMapper extends PaginatedMapper<XEntity, XItemApiDto> {
        private readonly entityCache = new Map<string, XEntity>();
        protected mapItemFromDto(dto: XItemApiDto): XEntity {
            MapperUtils.validateDto(dto, { required: ['id'] });
            const props: XProps = { uniqId: dto.id, /* … */, status: dto.is_active ? Status.ACTIVE : Status.INACTIVE, updatedAt: dto.updated_at };
            const cached = this.entityCache.get(`dto:${dto.id}`);
            const entity = cached ? cached.with(props) : new XEntity(props);
            this.entityCache.set(`dto:${dto.id}`, entity);
            return entity;
        }
    }
    ```
- **Référence** : `mappers/infrastructure-type.mapper.ts`,
  `mappers/infrastructure-type-select.mapper.ts`.

## `mapper` — command (fonction pure)

- **Rôle DDD/CQRS** : `validate-contract` domaine → DTO requête (snake_case).
- **Règle mécanique** : fonction pure
  `xCreateMapper(validContract): XCreateApiDto`, construit l'objet **champ par
  champ conditionnellement** (`if (validContract.champ) params.champ = …`),
  jamais un spread aveugle. Mapper de filtre : traduit `status: Status.ACTIVE`
  en `is_active: boolean` côté wire.
- **Squelette** :
    ```ts
    export function xCreateMapper(
        validContract: XCreateValidateContract
    ): XCreateApiDto {
        const params = {} as XCreateApiDto;
        if (validContract.champA) params.champ_a = validContract.champA;
        return params;
    }
    ```
- **Référence** : `mappers/infrastructure-type-create.mapper.ts`,
  `mappers/infrastructure-type-filter.mapper.ts`.

## `api-source` (`@Service`, `HttpClient`)

- **Rôle DDD/CQRS** : appel HTTP brut, une méthode par opération.
- **Règle mécanique** : `baseUrl = inject(SETTINGS_API_URL)` (kernel) ; liste =
  `GET {base}{endpoint}?page={page}` + `buildHttpParams(dto)` +
  `HttpContext().set(BYPASS_CACHE, options?.forceRefresh ?? false)` ; create =
  `POST {endpoint}/store` + `buildHttpPayload(dto, [])` ; update =
  `POST {endpoint}/{id}/update` + whitelist `['id']` exclu du payload ; delete =
  `DELETE {endpoint}/{id}/delete`. Retour toujours `MessageResponseDto` pour les
  mutations (jamais un type ad hoc).
- **Référence** : `sources/infrastructure-type.api.ts`.

## `repository-impl` (`@Service`, `implements <Port>`)

- **Rôle DDD/CQRS** : assemble `api-source` + `mapper` derrière le port domaine.
- **Règle mécanique** : chaque méthode =
  `this.api.X(mapper(validContract)).pipe(map(response => this.mapper.mapFromDto(response) | this.messageMapper.mapFromMessage(response)))`.
  Mutations → toujours via `MessageResultMapper` (kernel, applique aussi
  `assertResponseOk`, donc les erreurs serveur remontent dans la loop). Liste →
  via le response-mapper de l'entité (`mapFromDto`, hérite `PaginatedMapper` →
  renvoie `PageResult`).
- **Référence** : `repositories/infrastructure-type.repository.impl.ts`.

## Dépendances (`package.json`)

`{domain module, @cmz/shared-data, @cmz/shared-domain, @cmz/core, @angular/core, @angular/common}`
— vérifier `deps = imports` après écriture (aucun import fantôme, aucune dep non
utilisée).
