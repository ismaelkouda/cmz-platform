# Mémo d'investigation — schéma d'API source de vérité (OpenAPI)

**Statut : mémo factuel, aucune recommandation. Décision réservée à un humain.**

Date : 2026-08-10.

## 1. État actuel

Aucun schéma OpenAPI, JSON Schema, ou équivalent versionné n'existe dans le
dépôt (`grep -rli "openapi\|swagger" .` sur les fichiers `.ts`/`.mjs`/
`.json`/`.yaml`/`.yml`, hors `node_modules`, → 0 résultat).

Les DTOs sont des interfaces TypeScript écrites à la main, un fichier par
ressource/opération, dans `libs/<module>/data/src/lib/dtos/` :

```bash
find libs -path "*/data/src/lib/dtos/*" -name "*.ts" | wc -l
# → 301
```

Exemple représentatif
(`libs/processing/data/src/lib/dtos/processing-details-api.dto.ts`) :

```typescript
export interface ProcessingDetailsItemApiDto {
    id: string;
    uniq_id: string;
    request_report_uniq_id: string;
    source: ReportSourceDto;
    location_method: LocationMethodDto;
    // ... ~30 champs snake_case, wire format
}
```

Ces interfaces sont ensuite traduites vers le modèle domaine par les mappers
(`libs/<module>/data/src/lib/mappers/`), selon la convention déjà établie et
documentée ailleurs dans ce dépôt (`LLM_CONTEXT.md`).

**Source de vérité actuelle du contenu de ces DTOs :** `LLM_CONTEXT.md` §4
directive 2 impose d'inspecter le projet legacy via la variable d'environnement
`SEOS_LEGACY_ROOT` (`$SEOS_LEGACY_ROOT/src/presentation/pages/<module>`) plutôt
que d'inventer des champs. Ce projet legacy est un **frontend** (présentation),
pas un schéma backend — les DTOs actuels sont donc une rétro-ingénierie de la
façon dont le frontend legacy consommait l'API, pas la transcription d'un
contrat backend documenté. Aucune trace dans le dépôt d'un accès direct à une
spécification côté serveur.

`tools/mock-server/domains/*.mjs` (14 fichiers, un par module fonctionnel)
définit indépendamment, en JavaScript brut, des objets littéraux qui imitent la
forme wire (exemple : `buildProcessingDetail()` dans `processing.mjs`, ~30
champs en dur). Ces fichiers **n'importent aucun DTO TypeScript**
(`grep -rn "@cmz/" tools/mock-server/` ne retourne qu'une mention en
commentaire, aucun import réel) — ils ne peuvent techniquement pas le faire
simplement puisque les DTOs sont des types TypeScript effacés à la compilation,
sans représentation runtime. **Conséquence factuelle :** il existe aujourd'hui 3
représentations indépendantes et maintenues à la main de la même forme de donnée
— le DTO TypeScript, le mock JS, et (implicitement) l'API réelle — sans aucun
mécanisme qui garantisse leur synchronisation. Une divergence entre les 3 ne
serait détectée par aucun outil du dépôt.

## 2. Ce qu'impliquerait un schéma OpenAPI versionné

Si un schéma OpenAPI (ou AsyncAPI/JSON Schema selon le protocole réel) devenait
la source de vérité :

- **Emplacement proposé pour discussion** (pas une recommandation) : un
  répertoire racine dédié, par exemple `openapi/` ou `contracts/`, versionné
  avec le code, à l'image de `docs/architecture/corpus/pair.schema.json` qui
  joue déjà ce rôle de contrat versionné pour le corpus SEOS.
- **Génération des DTOs à partir du schéma** : plusieurs générateurs TypeScript
  existent dans l'écosystème npm (`openapi-typescript`,
  `swagger-typescript-api`, `@openapitools/openapi-generator-cli`, entre autres)
  — le choix précis n'est pas tranché ici, mais nécessiterait d'évaluer la
  compatibilité avec la convention actuelle (interfaces `snake_case` nommées
  `*ApiDto`, wrapper `SimpleResponseDto`/ `PaginatedResponseDto` déjà utilisé
  par tous les mappers `data`) — soit le générateur produit directement des DTOs
  bruts qu'il faudrait adapter au wrapper existant, soit une étape de
  post-traitement serait nécessaire.
- **Impact sur `tools/mock-server`** : un schéma OpenAPI permettrait de générer
  les réponses mock automatiquement (des outils comme `prism`, `msw` avec des
  plugins OpenAPI, ou un générateur maison lisant le schéma) au lieu des 14
  fichiers `.mjs` actuellement écrits et maintenus à la main. Ceci supprimerait
  la 2ᵉ des 3 représentations indépendantes citées en §1, mais représenterait
  une réécriture non triviale de `tools/mock-server/` (actuellement ~14 fichiers
  de domaine plus `router.mjs`, `paginate.mjs`, `ids.mjs`, `http.mjs`).
- **Oracle de vérification (`LLM_CONTEXT.md` §4.3)** : un nouveau contrôle
  pourrait être ajouté (`bunx nx run-many -t build`, `eslint`,
  `ngc --strictTemplates` existent déjà) — par exemple un script validant que
  chaque DTO TypeScript correspond bien au schéma OpenAPI, sur le modèle exact
  de `tools/corpus/validate-pair-schema.mjs` qui valide déjà le corpus SEOS
  contre `pair.schema.json`. Ce script n'existe pas encore.

## 3. Options si le schéma OpenAPI ne peut pas être obtenu du backend

Aucune des options suivantes n'est recommandée ici — la décision revient à un
humain avec visibilité sur l'équipe backend et ses contraintes.

**Option A — Rétro-ingénierie a posteriori depuis les DTOs existants.** Générer
un schéma OpenAPI en observant les 301 DTOs TypeScript actuels et en le
formalisant. Avantage : ne dépend d'aucune coordination externe, peut démarrer
immédiatement. Inconvénient : formalise les DTOs _tels qu'actuellement compris
côté frontend_ (eux-mêmes issus d'une rétro-ingénierie du frontend legacy, cf.
§1) — un schéma ainsi produit hérite de toute erreur ou omission déjà présente
dans les DTOs actuels sans les corriger, et ne garantit pas la conformité avec
ce que le backend retourne réellement en production.

**Option B — Rétro-ingénierie depuis le trafic réseau réel.** Capturer des
réponses HTTP réelles (par exemple via un proxy en environnement de staging) et
en dériver un schéma. Avantage : reflète la réalité du wire format, pas
seulement l'interprétation qu'en fait le code frontend actuel. Inconvénient :
nécessite un accès à un environnement où du trafic réel peut être observé (accès
humain requis, cf. `taches-restantes.md` — la même catégorie de contrainte que
les items OPS-4/T12-7 déjà identifiés comme hors de portée d'un agent) ; risque
de capturer des cas non exhaustifs (statuts d'erreur, champs optionnels absents
des échantillons).

**Option C — Demander le schéma à l'équipe backend.** Avantage : source de
vérité la plus fiable si elle existe déjà côté serveur (beaucoup de frameworks
backend modernes génèrent OpenAPI nativement). Inconvénient : dépend d'une
coordination inter-équipe et d'un délai hors du contrôle de ce dépôt ; si le
backend n'a lui-même pas de OpenAPI formalisé, cette option se réduit à demander
au backend de produire l'Option A ou B de son côté.

**Option D — Ne rien formaliser, garder le statu quo documenté.** Accepter
explicitement (au lieu de l'ignorer implicitement comme aujourd'hui) que les
DTOs restent à la charge du frontend, rétro-ingéniés depuis le legacy et
maintenus à la main, sans schéma source de vérité séparé. Avantage : aucun coût
d'outillage. Inconvénient : le risque de divergence à 3 faces décrit en §1 reste
entier et non instrumenté.

## 4. Exécution — T2-1 Option A (2026-08-13)

**Décision actée par l'utilisateur : Option A.** Ce mémo restait un document
d'investigation factuel sans recommandation (voir l'avertissement de statut en
tête de fichier) ; la décision de choisir l'Option A a été prise séparément,
hors de ce document, et n'est pas rouverte ici.

### Ce qui a été généré

- **Générateur** : `tools/schema/generate-dto-schema.mjs` — parcourt
  `libs/*/data/src/lib/dtos/*.ts` (303 fichiers au 2026-08-13 ; le comptage §1
  ci-dessus indiquait 301, écart mineur non investigué plus avant, noté tel
  quel) via l'API TypeScript Compiler (`ts.createProgram` sur
  `tsconfig.base.json`, parcours AST des `interface`/`type`/`enum` exportés —
  aucune exécution de code DTO, aucune dépendance npm/bun nouvelle, même
  doctrine que `tools/corpus/validate-pair-schema.mjs`).
- **Schéma produit** : `docs/architecture/schema/dto.schema.json` — JSON Schema
  draft 2020-12, **432 définitions** (`$defs`) extraites des 303 fichiers DTO,
  triées alphabétiquement pour un diff Git stable, `additionalProperties: false`
  sur tous les objets, `required` = champs non-optionnels, unions de string
  literals → `enum`, `| null` → membre `"null"` dans `type`.
- **Gate de fraîcheur (T2-2, portée limitée)** : `tools/check-dto-schema.mjs` —
  régénère le schéma en mémoire et le compare au fichier committé
  (`git diff --no-index` sur une copie temporaire, même mécanisme que
  `tools/check-docs-freshness.mjs`). Ne valide **pas** la conformité des mappers
  au schéma (chantier séparé, non couvert ici) ni la conformité du schéma à
  l'API réelle (impossible par construction — voir limite ci-dessous).
- Scripts : `bun run generate:dto-schema`, `bun run check:dto-schema` — ce
  dernier branché dans `check:all` juste après `check:pair-schema`.

### Choix de modélisation des génériques

`SimpleResponseDto<T>`, `PaginatedResponseDto<T>` et `Paginate<T>`
(`libs/shared/data/src/lib/dtos/simple-response.dto.ts`) n'ont pas d'équivalent
direct en JSON Schema (pas de generics). Choix retenu : chaque site d'usage
concret (ex.
`type ProcessingDetailsResponseDto = SimpleResponseDto<ProcessingDetailsItemApiDto>`)
produit sa propre définition **instanciée** dans `$defs` sous le nom du type
consommateur exporté (`$defs.ProcessingDetailsResponseDto`), avec `T` résolu en
`$ref` vers le DTO concret. Les 3 types génériques eux-mêmes obtiennent en plus
une entrée `$defs` documentaire (`$defs.SimpleResponseDto`, etc.) avec `T` non
contraint — présente pour la lisibilité, mais aucune autre définition n'y
`$ref`-ence directement.

### Limitations et cas non couverts

- **`ReportLocationDto`**
  (`libs/shared/data/src/lib/dtos/report-location.dto.ts`) importe
  `CoordinatesProps`, `LocationMethod`, `LocationType` depuis
  `@cmz/shared-domain` — pas depuis un autre DTO. C'est un DTO qui sort de la
  couche `data` pour référencer directement la couche `domain`, hors du
  périmètre déclaré du générateur (`libs/*/data/src/lib/dtos/*.ts` uniquement).
  Les 3 champs concernés sont modélisés sans contrainte (`{}`, accepte toute
  valeur) plutôt que d'inventer une forme. Signalé ici comme une possible
  anomalie de couche à examiner séparément — ce mémo ne tranche pas si c'est une
  erreur d'architecture ou un cas légitime.
- Le type DOM `File` (upload multipart, ex. `HomeCreateApiDto.image_file`) est
  modélisé sans contrainte (`{}`) — un payload binaire n'a pas de forme JSON
  représentable.
- Portée syntaxique non rencontrée dans les 303 DTOs actuels donc non
  implémentée : tuples, index signatures `[key: string]`, `any`, `unknown`,
  génériques utilisateur au-delà de ceux de `simple-response.dto.ts`. Si l'un de
  ces cas apparaît dans un futur DTO, le générateur émet un avertissement
  explicite (non silencieux) plutôt que d'échouer ou d'ignorer.

### Limite de conformité — à ne jamais perdre de vue

**Ce schéma ne prouve rien sur l'API réelle.** Il formalise ce que les 303 DTOs
TypeScript affirment aujourd'hui — eux-mêmes une rétro-ingénierie du frontend
legacy (§1). Toute erreur, omission ou champ mal typé déjà présent dans un DTO
se retrouve donc fidèlement reproduit dans le schéma. `check:dto-schema`
garantit uniquement que **le schéma committé reflète l'état actuel des DTOs** —
pas que les DTOs reflètent l'API. C'est un filet anti-dérive interne (DTO ↔
mapper ↔ mock, cf. §1), pas une preuve de contrat externe. Les Options B
(capture réseau réel) et C (schéma fourni par le backend) décrites en §3 restent
entièrement ouvertes et bloquées-humain — cette exécution de l'Option A ne les
rend pas caduques, elle ne fait que combler l'absence totale de schéma qui
existait avant.
