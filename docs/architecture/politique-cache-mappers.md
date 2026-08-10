# Politique de cache des mappers — mémo d'investigation (P2-2)

**Statut : investigation seule. Aucun des 67 mappers n'a été modifié. La
migration reste une décision à prendre séparément, une fois la conception
ci-dessous validée.**

Date : 2026-08-10.

## 1. Périmètre exact

```bash
grep -rl "entityCache = new Map" libs/ | wc -l
# → 67
```

La liste complète des 67 fichiers a été vérifiée (pas seulement comptée) :
tous suivent, sans exception, exactement le même triptyque à l'intérieur de
leur `mapItemFromDto` :

```typescript
private readonly entityCache = new Map<string, XxxEntity>();

// ... dans mapItemFromDto(dto) :
const cacheKey = `dto:${dto.id}`; // ou dto.uniq_id, ou props.uniqId
const cached = this.entityCache.get(cacheKey);
const entity = cached ? cached.with(props) : new XxxEntity(props);
this.entityCache.set(cacheKey, entity);
return entity;
```

Vérifications faites avant d'écrire ce mémo (pas une supposition) :

- `for f in $(grep -rl "entityCache = new Map" libs/); do grep -q
  "\.with(props)" "$f" || echo "$f"; done` → **aucune sortie** : les 67
  fichiers appellent bien `.with(props)`, sans exception.
- `grep -rn "entityCache.clear\|entityCache.delete" libs/` → **aucune
  sortie** : aucun des 67 caches n'est jamais vidé ni partiellement purgé.
  La seule remise à zéro constatée est indirecte : `SessionService.clear()`
  déclenche un rechargement complet de la page, qui efface toute la mémoire
  JS (donc les 67 `Map` avec). Il n'existe **aucun mécanisme de purge
  pendant une session active**.
- Répartition par module (tous dans la couche `data`, aucun dans
  `domain`/`application`/`ui`), obtenue par
  `grep -rl "entityCache = new Map" libs/ | sed -E 's#libs/([^/]+)/.*#\1#'
  | sort | uniq -c | sort -rn` :

  | Module                        | Fichiers |
  | ------------------------------ | -------- |
  | content-management             | 12       |
  | coverage-areas                 | 8        |
  | administrative-boundary        | 8        |
  | team-organization               | 7        |
  | report-states                  | 6        |
  | settings-security               | 5        |
  | processing                     | 5        |
  | requests                       | 4        |
  | finalization                   | 4        |
  | administrative-infrastructure  | 4        |
  | communication                  | 3        |
  | dashboard                       | 1        |
  | **Total**                      | **67**   |

  Somme vérifiée = 67, cohérente avec le décompte global de la commande
  citée en tête de section.

## 2. Ce que le cache fait réellement (pas seulement de la mémoïsation)

C'est le point le plus important de ce mémo, et il change la conception
proposée en §3 : **le cache n'est pas d'abord un cache de performance**
(éviter de refaire le travail de mapping), **c'est un mécanisme de
stabilité de référence** pour la détection de changements d'Angular
(signals / `computed()` / `@for` avec `track`).

Preuve : chaque entité cachée expose une méthode `with(props)` (vérifiée
sur `ReportStatesDetailsEntity`, `MunicipalityEntity`, et par extension les
67 mappers qui l'appellent tous) dont le contrat est :

```typescript
// report-states-details.entity.ts:179
with(props: ReportStatesDetailsProps): ReportStatesDetailsEntity {
    if (
        this.props.updatedAt === props.updatedAt &&
        this.props.uniqId === props.uniqId
    ) {
        return this; // même référence — pas de nouvelle instance
    }
    return new ReportStatesDetailsEntity(props, this.permissions);
}
```

Autrement dit : si le DTO retourné par le serveur n'a pas changé
(`updatedAt` identique), le mapper **doit** renvoyer exactement le même
objet JS qu'au dernier appel, pas une copie structurellement égale. Sans le
`entityCache`, chaque appel à `mapItemFromDto` créerait une nouvelle
instance à chaque re-fetch, même si rien n'a changé côté serveur — cassant
la stabilité de référence sur laquelle s'appuie la détection de
changements par égalité (`===`) des signals Angular, et déclenchant des
re-rendus/recalculs `computed()` inutiles en aval.

**Conséquence pour la conception : toute classe de base de cache doit
préserver ce contrat `get → with(props) si présent, sinon new` — un cache
générique de type "TTL simple" ou "renvoie toujours la valeur en cache sans
appeler `with()`" casserait ce mécanisme et introduirait un bug de
fraîcheur des données (l'entité ne serait jamais mise à jour après le
premier appel).**

## 3. Conception proposée — `CachedEntityMapper` (LRU)

### 3.1 Choix structurel : composition, pas héritage

Les 67 mappers étendent aujourd'hui soit `SimpleResponseMapper<TEntity,
TItemDto>`, soit `PaginatedMapper<TEntity, TItemDto>`
(`libs/shared/data/src/lib/mappers/base/`). TypeScript n'autorise qu'un
seul `extends`. Deux options :

- **Option A — nouvelle classe de base parallèle** (`CachedSimpleResponseMapper`,
  `CachedPaginatedMapper`) qui étend les classes existantes et ajoute la
  mécanique de cache. Nécessiterait de changer la classe parente des 67
  mappers (`extends SimpleResponseMapper<...>` → `extends
  CachedSimpleResponseMapper<...>`), un changement plus invasif.
- **Option B — composition** (recommandée) : une classe utilitaire
  autonome `LruEntityCache<TEntity>`, injectée/instanciée comme un simple
  remplacement du `new Map()` actuel. Les mappers continuent d'étendre
  `SimpleResponseMapper`/`PaginatedMapper` sans changement de hiérarchie ;
  seule la ligne `private readonly entityCache = new Map<string,
  XxxEntity>()` change pour `private readonly entityCache = new
  LruEntityCache<XxxEntity>({ maxSize: ... })`. Diff minimal par fichier
  (une ligne de déclaration), zéro changement de hiérarchie de classes,
  cohérent avec le principe de moindre surface de changement pour une
  migration de 67 fichiers.

**Recommandation : Option B.**

### 3.2 API proposée

```typescript
// libs/shared/data/src/lib/mappers/base/lru-entity-cache.ts

export interface LruEntityCacheOptions {
    /** Nombre maximal d'entités conservées avant éviction. */
    readonly maxSize: number;
}

/**
 * Cache d'entités à éviction LRU, conçu pour remplacer le `new Map<string,
 * TEntity>()` actuellement dupliqué dans 67 mappers. Préserve le contrat
 * existant : `getOrCreate` appelle `entity.with(props)` sur un hit (stabilité
 * de référence si les props n'ont pas changé), construit une nouvelle
 * instance sinon.
 */
export class LruEntityCache<TEntity extends { with(props: unknown): TEntity }> {
    private readonly store = new Map<string, TEntity>();

    constructor(private readonly options: LruEntityCacheOptions) {}

    /**
     * Remplace le triptyque `get / with / set` dupliqué dans chaque mapper.
     * `props` doit être le même objet que celui passé à `factory()`, pour que
     * `entity.with(props)` fonctionne (contrat identique à l'existant).
     */
    getOrCreate<TProps>(
        key: string,
        props: TProps,
        factory: (props: TProps) => TEntity
    ): TEntity {
        const cached = this.store.get(key);
        if (cached) {
            // Ré-insertion pour marquer la clé comme récemment utilisée
            // (un `Map` JS itère dans l'ordre d'insertion : supprimer puis
            // ré-ajouter la déplace en position "la plus récente").
            this.store.delete(key);
            const entity = cached.with(props);
            this.store.set(key, entity);
            return entity;
        }

        const entity = factory(props);
        this.store.set(key, entity);
        this.evictIfNeeded();
        return entity;
    }

    private evictIfNeeded(): void {
        while (this.store.size > this.options.maxSize) {
            const oldestKey = this.store.keys().next().value;
            if (oldestKey === undefined) {
                break;
            }
            this.store.delete(oldestKey);
        }
    }

    /** Pour les tests et un éventuel hook `SessionService.clear()` futur. */
    clear(): void {
        this.store.clear();
    }

    get size(): number {
        return this.store.size;
    }
}
```

Usage dans un mapper migré (exemple, **non appliqué** — illustratif) :

```typescript
// report-states-details.mapper.ts, après migration hypothétique
private readonly entityCache = new LruEntityCache<ReportStatesDetailsEntity>({
    maxSize: DEFAULT_ENTITY_CACHE_MAX_SIZE,
});

protected override mapItemFromDto(dto: ReportStatesDetailsItemApiDto): ReportStatesDetailsEntity {
    // ... construction de `props` inchangée ...
    return this.entityCache.getOrCreate(
        `dto:${dto.uniq_id}`,
        props,
        (p) => new ReportStatesDetailsEntity(p)
    );
}
```

Le diff par mapper migré serait de l'ordre de 3-5 lignes (déclaration du
cache + remplacement des 4 lignes `get`/`with`/`new`/`set` par un seul appel
à `getOrCreate`), répété 67 fois.

### 3.3 Taille maximale par défaut

Aucune mesure de la taille réelle des caches en session active longue
n'existe aujourd'hui (le constat initial le note déjà). Proposition :
- Une constante partagée `DEFAULT_ENTITY_CACHE_MAX_SIZE` dans
  `libs/shared/data` (valeur à déterminer — un ordre de grandeur de 200 à
  500 entités par mapper est raisonnable pour des listes paginées d'objets
  métier, mais **ceci est une hypothèse, pas une mesure** — un instrument
  temporaire type `console.debug` ou compteur exposé au monitoring
  pourrait affiner ce chiffre avant la migration).
- `maxSize` reste configurable par mapper individuellement (paramètre du
  constructeur `LruEntityCacheOptions`), pour les mappers dont le jeu de
  travail réel diffère significativement (ex. `MunicipalityMapper`, borné
  par le nombre de communes en France ≈ 35 000, contre
  `ReportStatesDetailsMapper`, borné par le volume de signalements traités
  en session).

### 3.4 Ce que cette conception ne couvre pas (hors périmètre du mémo)

- Pas de politique de cache inter-onglets ou persistée (`localStorage`) —
  le cache reste en mémoire JS, comme aujourd'hui.
- Pas de invalidation explicite sur mutation (create/update/delete) — le
  comportement actuel (`with(props)` compare `updatedAt`) reste inchangé ;
  une entité mise à jour ailleurs n'est rafraîchie dans le cache qu'au
  prochain appel de `mapItemFromDto` avec un DTO à jour.
- Pas de hook `SessionService.clear()` → `LruEntityCache.clear()` proposé
  ici (la méthode `clear()` existe dans l'API pour permettre ce câblage
  plus tard, mais le câbler changerait un comportement observable et sort
  du périmètre "conception seule" de ce mémo).

## 4. Prochaine étape (hors périmètre de ce mémo)

Une fois cette conception validée : créer un item de backlog dédié pour (1)
implémenter `LruEntityCache` avec des tests unitaires couvrant le contrat
`with()` et l'éviction LRU, (2) migrer les 67 mappers par lot (un module à
la fois, avec vérification `build`+`lint`+`test` après chaque lot, à
l'image de la méthode utilisée pour P1-4/P1-5 dans
`docs/architecture/backlog-llm.md`), (3) mesurer la taille réelle des
caches en session active avant de figer `DEFAULT_ENTITY_CACHE_MAX_SIZE`.
