# ADR-0021 — Seuils de couverture de tests par couche

- **Statut :** Accepted
- **Date :** 2026-08-11

## Contexte

`tools/vitest-lib.config.ts` déclare déjà un bloc `coverage` (provider `v8`,
reporters `text`+`lcov`) depuis la mise en place de l'outillage de tests
(ADR-0008), mais **aucun seuil n'y est configuré et le provider
`@vitest/coverage-v8` n'est pas installé** — vérifié : `node_modules/@vitest/`
n'existe pas, une exécution `--coverage` échoue. La couverture n'a donc
**jamais été mesurée** sur ce dépôt à ce jour, ni par couche ni globalement.

T12-5 (`docs/architecture/taches-restantes.md`) prévoit de câbler
`--coverage` en artefact + gate PR — mais câbler un gate sans seuils déjà
décidés reviendrait soit à bloquer arbitrairement sur un premier chiffre
mesuré par accident, soit à ne rien bloquer du tout (gate décoratif, même
défaut que celui documenté dans ADR-0016 pour le budget de bundle : « un
message de commit ne suffit pas », ici transposé à « une mesure de CI sans
seuil déclaré ne suffit pas »). Cet ADR fixe la **politique de seuils**
avant que T12-5 câble l'exécution — dans l'ordre inverse, un premier run
deviendrait la référence par défaut, sans arbitrage.

**Signal disponible aujourd'hui, faute de couverture mesurée : densité de
specs par fichier source**, calculée directement sur l'arbre (`find libs -path
"*/<couche>/src/*" -name "*.ts"`, hors `*.spec.ts`/`*.test.ts`/`index.ts`) :

| Couche               | Fichiers source | Fichiers `.spec.ts` | Ratio  |
| --------------------- | ---------------: | --------------------: | -----: |
| `domain`               | 1062              | 38                     | 3,6 %  |
| `data`                 | 832               | 96                     | 11,5 % |
| `application`          | 212               | 21                     | 9,9 %  |
| `ui`                   | 532               | 7                      | 1,3 %  |
| `shared/browser`       | 4                 | 1                      | —      |
| `shared/constants`     | 1                 | 0                      | —      |
| `core`                 | 9                 | 4                      | —      |

**Ce tableau ne mesure pas la couverture** (un ratio de fichiers n'est pas un
pourcentage de lignes exécutées — un `.spec.ts` peut couvrir plusieurs petits
fichiers voisins, ex. un mapper + ses DTOs) et ne doit pas être cité comme
tel. Il sert uniquement à motiver la hiérarchie des seuils ci-dessous : la
couche `domain` contient majoritairement des entités/value objects/enums/ports
(structures sans branchement, rien à asserter au-delà du typage déjà vérifié
par `tsc`), ce qui explique un ratio bas sans que ce soit un signal d'alerte
en soi — à la différence de `data` (mappers/repositories, déjà identifiés
comme angle mort réel par T3-1/T12-19/T12-20, tous trois des mappers sans
test découverts en cours d'audit) où un ratio bas serait un vrai problème.

## Options envisagées

### Option A — Seuil unique global, pas de distinction par couche

- Avantages : simple à écrire et à comprendre.
- Inconvénients : ignore que `domain`/`data` (logique pure, pas de framework,
  le moins cher à tester) et `ui` (composants Angular, template-heavy, déjà
  couvert en partie par la gate a11y T12-8 et l'e2e smoke T12-6) n'ont
  structurellement pas le même coût ni la même valeur marginale par
  pourcentage de couverture. Un seuil global fixé bas pour ne pas bloquer
  `ui` laisserait `domain`/`data` sous-testés sans le détecter ; fixé haut
  pour `domain`/`data`, il bloquerait `ui` sur un objectif hors d'atteinte
  sans refonte de stratégie de test (qui relève d'e2e, pas d'unitaire).

### Option B — Seuils cibles par couche, bloquants dès l'activation

- Avantages : reflète la réalité architecturale (Clean/DDD, 4 couches,
  cf. `LLM_CONTEXT.md`) ; un chiffre par couche est actionnable.
- Inconvénients : la couverture réelle n'a **jamais été mesurée** (cf.
  Contexte) — fixer un seuil bloquant sans savoir où se situe la base
  actuelle risque soit de bloquer immédiatement une majorité de PRs sur une
  base de 2 723 fichiers (si le seuil est optimiste), soit d'être fixé trop
  bas par prudence et de ne rien garantir (même défaut que l'option A côté
  faux sentiment de sécurité).

### Option C — Seuils cibles par couche + gate en deux temps (plancher mesuré, cible déclarée)

- Avantages : le gate bloquant démarre sur un **plancher réellement mesuré**
  (jamais arbitraire), ne peut jamais régresser une fois mesuré — même
  logique de ratchet déjà en usage dans ce dépôt pour
  `check:duplicates --family` (« bloquant à la hausse seulement... pas une
  dette à zéro », `.github/workflows/ci.yml`) et pour `ALLOWLIST_LIGNES`
  (`tools/check-file-weight.mjs`, vide par défaut, exceptions revues au cas
  par cas). La cible par couche reste déclarée et sert de signal de revue
  (non bloquant) tant que le plancher ne l'a pas atteinte — converge sans
  bloquer tout le monde le jour de l'activation.
- Inconvénients : deux notions à tenir à jour (plancher mesuré + cible
  déclarée) au lieu d'une ; nécessite que T12-5 lise ce plancher quelque part
  (fichier de métriques versionné, sur le modèle de `bundle-metrics.json`,
  ADR-0016) plutôt qu'un seul nombre codé en dur.

## Décision

**Option C.**

1. **Cibles déclarées par couche** (pourcentage de **lignes** couvertes,
   provider `v8`, métrique `lines` — la plus simple à interpréter et déjà
   configurée dans `tools/vitest-lib.config.ts`) :

   | Couche                          | Cible  | Raison                                                                                     |
   | -------------------------------- | -----: | -------------------------------------------------------------------------------------------- |
   | `domain`                         | 85 %   | Logique pure, aucune dépendance framework/I-O — le moins cher à tester, le plus dangereux à laisser non testé (règles métier). |
   | `data`                            | 80 %   | Mappers/repositories — branchements wire↔entité déjà identifiés comme angle mort réel (T3-1/T12-19/T12-20). |
   | `application`                     | 75 %   | Use-cases/facades — orchestration, dépend de doublures (ports mockés) donc légèrement plus coûteux que `domain`/`data`. |
   | `shared/*` (hors `ui`) + `core`   | 85 %   | Code kernel transverse — rayon d'impact d'un bug le plus large de tout le dépôt, même exigence que `domain`. |
   | `ui`                              | 55 %   | Composants Angular template-heavy — déjà complété par la gate a11y (T12-8) et l'e2e smoke Playwright (T12-6), pas seulement par l'unitaire ; un seuil élevé pousserait vers des tests de rendu superficiels plutôt que des tests de comportement utiles. |

2. **Plancher bloquant = mesure réelle, pas la cible.** Quand T12-5 câble
   `--coverage` pour la première fois, le **premier chiffre mesuré par
   couche** devient le plancher CI (jamais la cible ci-dessus tant qu'elle
   n'est pas atteinte). Le plancher est versionné dans un fichier de
   métriques (`coverage-metrics.json` ou équivalent, sur le modèle de
   `bundle-metrics.json` / ADR-0016) régénéré par une commande dédiée
   (`bun run coverage:record`, à créer par T12-5).
3. **Ratchet à la hausse uniquement** : une PR qui ferait baisser la
   couverture mesurée d'une couche sous son plancher versionné échoue le
   gate. Une PR qui l'améliore doit régénérer le fichier de métriques (le
   plancher monte, ne redescend jamais — même mécanique que
   `family-duplication-metrics.json`).
4. **Franchir la cible n'est pas une obligation immédiate** : tant que le
   plancher mesuré est sous la cible déclarée au tableau ci-dessus, l'écart
   reste visible (rapport `text`/`lcov` en artefact CI) mais **ne bloque
   pas**. Une fois le plancher ≥ cible, tout gate additionnel resterait le
   ratchet à la hausse du point 3 — la cible ne devient pas elle-même un
   nouveau plancher figé, pour ne pas décourager une amélioration
   au-dessus de la cible.
5. **Portée du gate** : `nx affected` uniquement (mêmes projets que
   lint/build/test dans `ci.yml`), pas un run complet à chaque PR — cohérent
   avec le reste du pipeline et évite qu'une PR sur un module paie le coût
   de mesurer les 71 libs.
6. **Rehausser une cible** (le tableau du point 1) suit la même règle que
   ADR-0016 pour les budgets de bundle : décision explicite dans un nouvel
   ADR (ou supersession de celui-ci), pas un ajustement silencieux en commit.
   **Baisser** une cible suit la même règle — ce n'est pas un curseur de
   confort, la baisser doit être justifiée au même titre que la monter.

## Justification

Le tableau de densité de specs (Contexte) confirme que les 4 couches n'ont
pas le même profil de testabilité — imposer un seul chiffre (Option A)
ignorerait cette réalité déjà visible dans l'arbre de fichiers actuel.
Bloquer immédiatement sur les cibles (Option B) créerait un gate sur un
territoire jamais mesuré : le risque n'est pas hypothétique, T3-1/T12-19/
T12-20 montrent que des angles morts réels existent déjà en `data`, mais
rien ne dit aujourd'hui à quel pourcentage exact se situe chaque couche. Le
ratchet (Option C) est le seul choix qui ne peut ni bloquer sur un chiffre
inventé, ni permettre une régression une fois mesuré — et il reprend un
mécanisme déjà éprouvé deux fois dans ce dépôt (`check:duplicates --family`,
`ALLOWLIST_LIGNES`) plutôt que d'introduire un troisième pattern de gate à
apprendre.

## Conséquences

### Positives

- Un seuil par couche cohérent avec l'architecture réelle (4 couches,
  `LLM_CONTEXT.md`), pas un chiffre générique.
- Le gate ne peut jamais être un theâtre de sécurité (Option A/B) : soit il
  mesure vraiment (plancher), soit il ne bloque pas (cible).
- Réutilise un mécanisme de ratchet déjà validé dans ce dépôt — moins de
  surface conceptuelle nouvelle pour les futurs contributeurs/agents.

### Négatives / dette acceptée

- Tant que T12-5 n'a pas câblé la mesure, ces cibles restent **déclaratives,
  non vérifiées** — cet ADR fixe la politique, pas l'état mesuré.
- Deux fichiers à maintenir en synchronisation une fois T12-5 fait
  (`coverage-metrics.json` + ce tableau) — même charge que
  `bundle-metrics.json` + ADR-0016 aujourd'hui, donc un modèle déjà amorti.
- Le ratio de densité de specs cité en Contexte pourrait être mal lu comme
  une mesure de couverture par un lecteur pressé malgré l'avertissement
  explicite — risque terminologique à surveiller dans les révisions futures
  de ce document.

### Points à réévaluer

- Dès que T12-5 mesure un premier plancher réel : si un plancher se révèle
  **au-dessus** de sa cible dès la première mesure (couche déjà mieux
  testée que prévu), relever la cible dans un nouvel ADR plutôt que de
  laisser une cible sous la réalité mesurée.
- Si `ui` reste durablement loin de 55 % même après stabilisation de la
  suite e2e (T12-7, e2e réel staging), réévaluer si le report de charge vers
  l'e2e justifie de baisser formellement la cible `ui`, plutôt que de la
  laisser comme un écart permanent non assumé.

## Références

- [ADR-0008](./0008-outillage-de-tests.md) — outillage de tests (Vitest,
  provider déjà déclaré).
- [ADR-0016](./0016-politique-budget-bundle.md) — précédent direct pour le
  mécanisme « plafond versionné + hausse seulement via ADR ».
- `tools/vitest-lib.config.ts` — bloc `coverage` existant, provider `v8`.
- `docs/architecture/taches-restantes.md` — T12-3 (couverture kernel
  `shared/`), T12-4 (cet ADR), T12-5 (câblage du gate).
- `.github/workflows/ci.yml` — job `duplicates` (`check:duplicates
  --family`), précédent de ratchet « bloquant à la hausse seulement ».
