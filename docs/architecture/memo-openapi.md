# Mémo d'investigation — schéma d'API source de vérité (OpenAPI)

**Statut : mémo factuel, aucune recommandation. Décision réservée à un
humain.**

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

Exemple représentatif (`libs/processing/data/src/lib/dtos/processing-details-api.dto.ts`) :

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

Ces interfaces sont ensuite traduites vers le modèle domaine par les
mappers (`libs/<module>/data/src/lib/mappers/`), selon la convention déjà
établie et documentée ailleurs dans ce dépôt (`LLM_CONTEXT.md`).

**Source de vérité actuelle du contenu de ces DTOs :** `LLM_CONTEXT.md` §4
directive 2 impose d'inspecter le projet legacy via la variable d'environnement
`SEOS_LEGACY_ROOT` (`$SEOS_LEGACY_ROOT/src/presentation/pages/<module>`)
plutôt que d'inventer des champs. Ce projet legacy est un **frontend**
(présentation), pas un schéma backend — les DTOs actuels sont donc une
rétro-ingénierie de la façon dont le frontend legacy consommait l'API, pas
la transcription d'un contrat backend documenté. Aucune trace dans le
dépôt d'un accès direct à une spécification côté serveur.

`tools/mock-server/domains/*.mjs` (14 fichiers, un par module fonctionnel)
définit indépendamment, en JavaScript brut, des objets littéraux qui
imitent la forme wire (exemple : `buildProcessingDetail()` dans
`processing.mjs`, ~30 champs en dur). Ces fichiers **n'importent aucun DTO
TypeScript** (`grep -rn "@cmz/" tools/mock-server/` ne retourne qu'une
mention en commentaire, aucun import réel) — ils ne peuvent techniquement
pas le faire simplement puisque les DTOs sont des types TypeScript effacés
à la compilation, sans représentation runtime. **Conséquence factuelle :**
il existe aujourd'hui 3 représentations indépendantes et maintenues à la
main de la même forme de donnée — le DTO TypeScript, le mock JS, et
(implicitement) l'API réelle — sans aucun mécanisme qui garantisse leur
synchronisation. Une divergence entre les 3 ne serait détectée par aucun
outil du dépôt.

## 2. Ce qu'impliquerait un schéma OpenAPI versionné

Si un schéma OpenAPI (ou AsyncAPI/JSON Schema selon le protocole réel)
devenait la source de vérité :

- **Emplacement proposé pour discussion** (pas une recommandation) : un
  répertoire racine dédié, par exemple `openapi/` ou `contracts/`, versionné
  avec le code, à l'image de `docs/architecture/corpus/pair.schema.json`
  qui joue déjà ce rôle de contrat versionné pour le corpus SEOS.
- **Génération des DTOs à partir du schéma** : plusieurs générateurs
  TypeScript existent dans l'écosystème npm (`openapi-typescript`,
  `swagger-typescript-api`, `@openapitools/openapi-generator-cli`, entre
  autres) — le choix précis n'est pas tranché ici, mais nécessiterait
  d'évaluer la compatibilité avec la convention actuelle (interfaces
  `snake_case` nommées `*ApiDto`, wrapper `SimpleResponseDto`/
  `PaginatedResponseDto` déjà utilisé par tous les mappers `data`) — soit
  le générateur produit directement des DTOs bruts qu'il faudrait adapter
  au wrapper existant, soit une étape de post-traitement serait nécessaire.
- **Impact sur `tools/mock-server`** : un schéma OpenAPI permettrait de
  générer les réponses mock automatiquement (des outils comme `prism`,
  `msw` avec des plugins OpenAPI, ou un générateur maison lisant le schéma)
  au lieu des 14 fichiers `.mjs` actuellement écrits et maintenus à la
  main. Ceci supprimerait la 2ᵉ des 3 représentations indépendantes citées
  en §1, mais représenterait une réécriture non triviale de
  `tools/mock-server/` (actuellement ~14 fichiers de domaine plus
  `router.mjs`, `paginate.mjs`, `ids.mjs`, `http.mjs`).
- **Oracle de vérification (`LLM_CONTEXT.md` §4.3)** : un nouveau contrôle
  pourrait être ajouté (`bunx nx run-many -t build`, `eslint`, `ngc
  --strictTemplates` existent déjà) — par exemple un script validant que
  chaque DTO TypeScript correspond bien au schéma OpenAPI, sur le modèle
  exact de `tools/corpus/validate-pair-schema.mjs` qui valide déjà le
  corpus SEOS contre `pair.schema.json`. Ce script n'existe pas encore.

## 3. Options si le schéma OpenAPI ne peut pas être obtenu du backend

Aucune des options suivantes n'est recommandée ici — la décision revient à
un humain avec visibilité sur l'équipe backend et ses contraintes.

**Option A — Rétro-ingénierie a posteriori depuis les DTOs existants.**
Générer un schéma OpenAPI en observant les 301 DTOs TypeScript actuels et
en le formalisant. Avantage : ne dépend d'aucune coordination externe,
peut démarrer immédiatement. Inconvénient : formalise les DTOs *tels
qu'actuellement compris côté frontend* (eux-mêmes issus d'une
rétro-ingénierie du frontend legacy, cf. §1) — un schéma ainsi produit
hérite de toute erreur ou omission déjà présente dans les DTOs actuels
sans les corriger, et ne garantit pas la conformité avec ce que le backend
retourne réellement en production.

**Option B — Rétro-ingénierie depuis le trafic réseau réel.** Capturer des
réponses HTTP réelles (par exemple via un proxy en environnement de
staging) et en dériver un schéma. Avantage : reflète la réalité du wire
format, pas seulement l'interprétation qu'en fait le code frontend actuel.
Inconvénient : nécessite un accès à un environnement où du trafic réel
peut être observé (accès humain requis, cf. `taches-restantes.md` — la
même catégorie de contrainte que les items OPS-4/T12-7 déjà identifiés
comme hors de portée d'un agent) ; risque de capturer des cas non
exhaustifs (statuts d'erreur, champs optionnels absents des échantillons).

**Option C — Demander le schéma à l'équipe backend.** Avantage : source de
vérité la plus fiable si elle existe déjà côté serveur (beaucoup de
frameworks backend modernes génèrent OpenAPI nativement). Inconvénient :
dépend d'une coordination inter-équipe et d'un délai hors du contrôle de
ce dépôt ; si le backend n'a lui-même pas de OpenAPI formalisé, cette
option se réduit à demander au backend de produire l'Option A ou B de son
côté.

**Option D — Ne rien formaliser, garder le statu quo documenté.**
Accepter explicitement (au lieu de l'ignorer implicitement comme
aujourd'hui) que les DTOs restent à la charge du frontend, rétro-ingéniés
depuis le legacy et maintenus à la main, sans schéma source de vérité
séparé. Avantage : aucun coût d'outillage. Inconvénient : le risque de
divergence à 3 faces décrit en §1 reste entier et non instrumenté.
