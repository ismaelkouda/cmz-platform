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
  l'appelant _pourrait_ fournir) ; `validate-contract` = même forme, tout requis
  (ce que le domaine _garantit_ après validation).
- **Règle mécanique** : `validate-contract` ne doit **jamais** être construit
  autrement que via son `validator` (pas de cast direct).
  `filter`/`find-one-filter` contracts ont tous leurs champs optionnels y
  compris `uniqId` (aligné sur delete).
- **Squelette** :
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
- **Référence** : `contracts/infrastructure-type-create.contract.ts` +
  `.validate-contract.ts`, et `infrastructure-type-filter.contract.ts` /
  `infrastructure-type-find-one-filter.contract.ts` (filtres — pas de
  validate-contract pour `filter`, seulement une fonction `validateXFilter` en
  `: void`, cf. `validator`).

## `validator`

- **Rôle DDD/CQRS** : porte de garde entre `contract` et `validate-contract`.
- **Règle mécanique** :
  `validateXCreate(c): asserts c is XCreateValidateContract`, lève
  `GenericRequiredError('<NS>.FORM.ERROR.CREATE.<CHAMP>_REQUIRE')` par champ
  manquant. Pour `filter` : signature `: void` (pas d'assertion tautologique),
  délègue à `assertValidDateRange` du kernel pour les plages de dates.
- **Squelette** :
    ```ts
    export function validateXCreate(
        contract: XCreateContract
    ): asserts contract is XCreateValidateContract {
        if (!contract.champA)
            throw new GenericRequiredError(
                '<NS>.FORM.ERROR.CREATE.CHAMP_A_REQUIRE'
            );
    }
    export function validateXFilter(contract: XFilterContract): void {
        assertValidDateRange(contract?.startDate, contract?.endDate);
    }
    ```
- **Référence** : `validators/infrastructure-type-create.validator.ts`,
  `validators/infrastructure-type-filter.validator.ts`.

## `value-object` (`*.vo.ts`)

- **Rôle DDD/CQRS** : point d'entrée unique de la validation — appelle le
  `validator` puis renvoie la forme validée, avec **whitelisting explicite**
  (jamais un simple spread du contrat brut).
- **Règle mécanique** : `xCreateVo(contract) → validate → { champA, champB }`
  littéral (pas `{...contract}`) — défensif contre l'ajout silencieux de champs.
- **Squelette** :
    ```ts
    export function xCreateVo(
        contract: XCreateContract
    ): XCreateValidateContract {
        validateXCreate(contract);
        return { champA: contract.champA, champB: contract.champB };
    }
    ```
- **Référence** : `value-objects/infrastructure-type-create.vo.ts`.

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
