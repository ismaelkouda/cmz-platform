# Archétypes — couche `domain`

Dépend uniquement de `@cmz/shared-domain` (+ `rxjs`). Zéro `@angular/core`, zéro
import `data`/`ui`. Un archétype = un fichier, structure plate par catégorie,
fichiers préfixés par entité.

## `enum` (wire-first)

- **Rôle DDD/CQRS** : vocabulaire fermé du domaine (ex. statut).
- **Règle mécanique** : la **valeur** est un code wire stable (pas une clé i18n)
  ; toujours accompagné d'un type dérivé et d'une garde `isX`. Les
  libellés/styles d'affichage n'entrent **jamais** ici (couche `ui`).
- **Squelette** :
    ```ts
    export const X = { A: 'a', B: 'b' } as const;
    export type X = (typeof X)[keyof typeof X];
    const X_VALUES = new Set<string>(Object.values(X));
    export function isX(value: string): value is X {
        return X_VALUES.has(value);
    }
    ```
- **Référence** : `enums/infrastructure-type-status.enum.ts` (`Status`).
- **Variantes connues** : si plusieurs entités d'un même module partagent le
  même vocabulaire (ex. 3× `ACTIVE/INACTIVE` dans le module boundary), **un
  seul** enum module, pas une copie par entité.

## `props`

- **Rôle DDD/CQRS** : forme de données portée par une entité — implémentée,
  jamais autonome (sinon → `interfaces/`).
- **Règle mécanique** : champs à plat, types domaine uniquement (pas de DTO).
  Une relation vers une autre entité du module est typée `{ id, name }` (ou VO
  kernel dédié), jamais réduite à un seul champ scalaire — sinon l'édition perd
  l'id nécessaire pour préremplir un select.
- **Squelette** :
    ```ts
    export interface XProps {
        uniqId: string;
        /* champs métier */;
        status: Status;
        updatedAt: string;
    }
    ```
- **Référence** : `props/infrastructure-type.props.ts`.
- **Variantes connues** : `find-one.props` peut porter des types plus riches que
  le `props` de liste (ex. `position: CoordinatesProps` vs `string`) — la liste
  reste légère, le détail complet.

## `entity`

- **Rôle DDD/CQRS** : porte-conteneur immuable autour de `props`, avec identité
  (`uniqId`).
- **Règle mécanique** : constructeur `private readonly props`, un getter par
  champ (jamais d'accès direct à `props` hors de la classe), méthode `with()`
  qui **renvoie la même instance** si les champs de comparaison (`updatedAt` +
  `uniqId`) sont inchangés (permet le cache de mapper `===`-stable). Aucun
  `statusStyle`/`actionsRef` (UI) sur l'entité.
- **Squelette** :
    ```ts
    export class XEntity {
        constructor(private readonly props: XProps) {}
        get uniqId(): string {
            return this.props.uniqId;
        }
        /* … un getter par champ … */
        with(props: XProps): XEntity {
            if (
                this.updatedAt === props.updatedAt &&
                this.uniqId === props.uniqId
            ) {
                return this;
            }
            return new XEntity(props);
        }
    }
    ```
- **Référence** : `entities/infrastructure-type.entity.ts`.

## `contract` + `validate-contract`

- **Rôle DDD/CQRS** : `contract` = entrée brute (tout optionnel, ce que
  l'appelant _pourrait_ fournir) ; `validate-contract` = même forme, avec
  **exactement les champs que la réalité métier rend obligatoires** marqués
  requis (le reste reste optionnel).
- **Règle mécanique — la requiredness se déduit au cas par cas, comme pour un
  champ de formulaire, pas par catégorie de fichier.** Un `filter` de liste
  (recherche) n'a généralement aucun champ requis ; mais un `find-one-filter` a
  quasi toujours un identifiant requis (`uniqId`) ; une vue imbriquée (ex.
  `departments-by-region-id`) doit être jugée pareil — si l'id du parent est
  indispensable pour que la requête ait un sens, il est **requis**, pas
  silencieusement optionnel. Vérifié sur le module de référence :
  `InfrastructureTypeFindOneFilterValidateContract` a bien `uniqId: string`
  (requis), au même titre que `create`/`update`.
- **Squelette (cas requis, ex. create ou find-one-filter)** :
    ```ts
    export interface XCreateContract {
        champA?: T;
        champB?: T;
    }
    export interface XCreateValidateContract {
        champA: T;
        champB: T;
    }
    ```
- **Squelette (cas sans champ requis, ex. filtre de liste pur recherche)** :
  `XFilterContract` seul suffit (pas de `validate-contract` séparé — rien à
  rendre requis).
- **Référence** : `contracts/infrastructure-type-create.contract.ts` +
  `.validate-contract.ts` (requis) ;
  `infrastructure-type-find-one-filter.contract.ts`
    - `.validate-contract.ts` (`uniqId` requis, **même mécanisme que create**) ;
      `infrastructure-type-filter.contract.ts` (aucun `validate-contract` :
      aucun champ requis dans ce cas précis, pas par principe général).

## `validator`

- **Rôle DDD/CQRS** : porte de garde entre `contract` et `validate-contract`.
- **Règle mécanique** : dès qu'**au moins un champ est requis** (create, update,
  find-one-filter, ou un filtre imbriqué avec id parent obligatoire) :
  `validateX(c): asserts c is XValidateContract`, lève
  `GenericRequiredError('<NS>.FORM.ERROR.<OP>.<CHAMP>_REQUIRE')` par champ
  manquant — **identique pour un filtre que pour un formulaire**, ce n'est pas
  un archétype à part. Quand **aucun** champ n'est requis (filtre de liste pur
  recherche) : signature `: void` (pas d'assertion tautologique), seulement les
  contraintes structurelles restantes (`assertValidDateRange`).
- **Squelette (champ requis — create ET find-one-filter suivent cette forme)** :
    ```ts
    export function validateXCreate(
        contract: XCreateContract
    ): asserts contract is XCreateValidateContract {
        if (!contract.champA)
            throw new GenericRequiredError(
                '<NS>.FORM.ERROR.CREATE.CHAMP_A_REQUIRE'
            );
    }
    export function validateXFindOneFilter(
        contract: XFindOneFilterContract
    ): asserts contract is XFindOneFilterValidateContract {
        if (!contract.uniqId)
            throw new GenericRequiredError(
                '<NS>.FORM.ERROR.FIND_ONE.UNIQ_ID_REQUIRE'
            );
    }
    ```
- **Squelette (aucun champ requis — filtre de liste)** :
    ```ts
    export function validateXFilter(contract: XFilterContract): void {
        assertValidDateRange(contract?.startDate, contract?.endDate);
    }
    ```
- **Référence** : `validators/infrastructure-type-create.validator.ts`,
  `validators/infrastructure-type-find-one-filter.validator.ts` (même forme que
  create, avec `GenericRequiredError`),
  `validators/infrastructure-type-filter.validator.ts` (aucun champ requis dans
  ce cas → `: void`).

## `value-object` (`*.vo.ts`)

- **Rôle DDD/CQRS** : point d'entrée unique de la validation — appelle le
  `validator` puis renvoie la forme validée au type `XValidateContract`.
- **Règle mécanique — vérifiée sur les 11 VO du module, deux formes selon un
  critère précis, pas une seule règle universelle :**
    1. **Whitelisting explicite** (`return { champA: contract.champA, ... }`
       littéral, jamais `{...contract}`) — **quand le contrat de mutation porte
       plusieurs champs destinés à un payload serveur** (`create`, `update`).
       Défensif : garantit que seuls les champs déclarés sortent du domaine,
       indépendamment de ce que l'appelant a pu accumuler sur l'objet en amont ;
       force aussi une erreur de compilation si `XValidateContract` s'enrichit
       d'un champ qu'on oublie d'ajouter ici.
    2. **Passthrough** (`return contract;` après l'assertion du validator) —
       **quand le contrat n'a qu'un seul champ identifiant** (`delete`,
       `enable`, `disable`, `find-one-filter` : juste `uniqId`) où whitelister
       n'apporterait rien de plus que l'assertion de type déjà faite ; **ou
       quand le validator ne rétrécit aucun type** (`filter` de liste sans champ
       requis, validator `: void`) — il n'y a alors rien à isoler, et le mapper
       `data` en aval retraduit de toute façon champ par champ vers le wire.
       **Ne pas généraliser l'un ou l'autre par défaut** : whitelister un VO à
       un seul champ est du bruit inutile ; faire un `return contract` sur un VO
       à plusieurs champs de mutation abandonne la défense qui est le rôle même
       du VO.
- **Squelette (whitelisting — payload multi-champs)** :
    ```ts
    export function xCreateVo(
        contract: XCreateContract
    ): XCreateValidateContract {
        validateXCreate(contract);
        return { champA: contract.champA, champB: contract.champB };
    }
    ```
- **Squelette (passthrough — mono-champ ou filtre sans requis)** :
    ```ts
    export function xDeleteVo(
        contract: XDeleteContract
    ): XDeleteValidateContract {
        validateXDelete(contract);
        return contract;
    }
    ```
- **Référence** : whitelisting →
  `value-objects/infrastructure-type-create.vo.ts`, `-update.vo.ts` ;
  passthrough → `-delete.vo.ts`, `-enable.vo.ts`, `-disable.vo.ts`,
  `-filter.vo.ts`, `-find-one-filter.vo.ts` (vérifié : les 11 VO du module
  suivent cette répartition sans exception).

## `filter-entity` (optionnel, seulement si logique de plage de dates)

- **Rôle DDD/CQRS** : normalise le contrat de filtre avant qu'il n'atteigne le
  repository (ex. bornes de date ouvertes).
- **Règle mécanique** : pure, ne valide pas (le validator l'a déjà fait) —
  seulement une transformation (`resolveOpenEndedEndDate`).
- **Référence** : `entities/infrastructure-type-filter.entity.ts`.

## `repository` (port), `*-find-one.repository`, `*-select.repository`

- **Rôle DDD/CQRS** : frontière domaine↔data — contrat d'accès aux données, sans
  savoir comment elles sont obtenues.
- **Règle mécanique** : **classe abstraite sans décorateur** (le domaine ne tire
  pas `@angular/core` ; le token DI est la classe elle-même, l'impl décorée vit
  en `data`). Méthode liste unifiée `execute` (jamais `readAll` pour la liste
  paginée — réservé à `select`). Types de retour **100 % domaine** :
  `PageResult<XEntity>` / `MessageEntity` / `SelectOption[]`, jamais un DTO ou
  une forme réseau (`Paginate`, `links`, etc.).
- **Squelette** :
    ```ts
    export abstract class XRepository {
        abstract execute(
            filter: XFilterContract,
            page: string,
            options?: FetchOptions
        ): Observable<PageResult<XEntity>>;
        abstract create(
            contract: XCreateValidateContract
        ): Observable<MessageEntity>;
        abstract update(
            contract: XUpdateValidateContract
        ): Observable<MessageEntity>;
        abstract delete(
            contract: XDeleteValidateContract
        ): Observable<MessageEntity>;
    }
    export abstract class XFindOneRepository {
        abstract execute(
            filter: XFindOneFilterValidateContract,
            options?: FetchOptions
        ): Observable<XFindOneEntity>;
    }
    export abstract class XSelectRepository {
        abstract readAll(options?: FetchOptions): Observable<SelectOption[]>;
    }
    ```
- **Référence** : `repositories/infrastructure-type.repository.ts` (+
  `-find-one.repository.ts`, `-select.repository.ts`).
- **Variantes connues** : entité **sans toggle** (ex. `region`) → pas de
  `enable`/`disable` sur le port ; entité **feuille sans enfants** (ex.
  `municipality`) → pas de vue imbriquée dérivée.
