# C6 — promotion gouvernée des compositions v2

- **Date :** 2026-10-09
- **Issue :**
  [#64 — PLAT-9](https://github.com/ismaelkouda/cmz-platform/issues/64)
- **Statut :** preuve technique fusionnée et CI `main` verte ; clôture de #64
  encore suspendue à la confirmation humaine explicite des huit points du §6
- **Autorités :** `PROJECT_AUTHORITY.md`, ADR-0094, issue #64 et matrice de
  capacités

## 1. Décision proposée

Promouvoir séparément `list-query` v2 et `action-request` v2 pour les cibles
`angular-nx` et `react-typescript`. Chaque coordonnée
`(kind, contract_version, target)` possède ses cas et ses oracles cible dans le
registre machine-readable.

Cette décision ne promeut pas :

- les chemins v1 `angular-layered`, qui restent `experimental` ;
- un pattern réutilisable de page composite, car C5 reste son seul cas produit
  réel ;
- toute la plateforme, toute une stack, l'interface C5 ou un backend vivant ;
- `create-module` v2, un lifecycle de retrait v2 ou l'archivage de SEOS.

Le plan C5 constitue la preuve d'intégration N×N des primitives, pas un second
pattern générique inventé à partir d'un seul écran.

## 2. Évolution du registre

Le schéma du registre passe à `2.0.0` et rend obligatoires :

- un identifiant stable ;
- la version exacte du contrat ;
- la cible et le modèle de sortie ;
- deux définitions métier distinctes pour `proven` ;
- des oracles isolés de rendu et de runtime propres à la cible ;
- un oracle `composed-page` propre à la cible.

Le validateur refuse les identités ou coordonnées dupliquées, les versions de
contrat divergentes, les chemins hors workspace ou par lien symbolique, les
sorties target-native qui réintroduisent les couches v1 et toute promotion sans
les deux portées d'oracle. Chaque oracle doit contenir une déclaration de test
et correspondre au SHA-256 relu dans le registre : un fichier vide ou modifié
après revue échoue fermé. Le hash ne juge pas la sémantique du test ; la CI et
la revue humaine restent obligatoires.

`create-module` continue de résoudre explicitement les seules entrées v1
`angular-layered` ; aucune entrée v2 n'est sélectionnée implicitement. Les deux
hashs de journaux v1 produits avant C6 restent acceptés pour la seule reprise de
ces transactions historiques. Ils sont bornés et testés ; toute autre dérive du
registre reste refusée.

## 3. Matrice de promotion des primitives

| Coordonnée                              | Cas distincts                    | Oracles isolés                                                 | Oracle composé                                          | Verdict candidat |
| --------------------------------------- | -------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------- | ---------------- |
| `action-request@2.0.0:angular-nx`       | `create-user`, `forgot-password` | renderer v2 + `stack-tests/angular/action-request-v2.spec.ts`  | `stack-tests/angular/page-composition-users-v2.spec.ts` | `proven`         |
| `action-request@2.0.0:react-typescript` | `create-user`, `forgot-password` | renderer v2 + `stack-tests/reactjs/action-request-v2.spec.ts`  | `stack-tests/reactjs/page-composition-users-v2.spec.ts` | `proven`         |
| `list-query@2.0.0:angular-nx`           | `users-list`, `profiles-select`  | renderer v2 + `stack-tests/angular/list-query-v2-page.spec.ts` | `stack-tests/angular/page-composition-users-v2.spec.ts` | `proven`         |
| `list-query@2.0.0:react-typescript`     | `users-list`, `profiles-select`  | renderer v2 + `stack-tests/reactjs/list-query-v2-page.spec.ts` | `stack-tests/reactjs/page-composition-users-v2.spec.ts` | `proven`         |

`users-list` est une page filtrée ; `profiles-select` est un tableau direct. Ils
ne démontrent pas un objet unique ou une map. `create-user` est la commande C5 ;
`forgot-password` fournit une seconde action exécutée isolément par les oracles
des deux cibles.

## 4. Critères de l'issue #64

| Critère                                                          | Artefacts                                                                         | Preuve réfutable                                                                                                                                         | Résultat attendu avant fusion                     |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| une `list-query` autonome                                        | définitions v2, modèle et renderers cible                                         | suites `list-query-v2-*` et stack tests `list-query-v2*.spec.ts`                                                                                         | Angular et React verts séparément                 |
| une `action-request` autonome                                    | définitions v2, modèle et renderers cible                                         | suites `action-request-v2-*` et stack tests `action-request-v2.spec.ts`                                                                                  | Angular et React verts séparément                 |
| une page N×list + N×action                                       | plan C5 avec deux queries et une commande ; compositions générées des deux cibles | `page-composition-users-v2.spec.ts` Angular et React                                                                                                     | deux GET, un POST et invalidation ciblée observés |
| erreurs partielles, concurrence, permissions et retry explicites | `page-execution-plan.json`, modèles d'exécution et bindings host                  | erreur métier sans reload, conservation des queries, `latest-wins`, annulation, double submit, permission refusée avant transport ; retry `none` vérifié | aucun comportement implicite                      |
| reproductible en CI depuis un clone propre                       | scripts de génération, manifests, tests core et stack, workflow CI                | `check:generator-platform`, Oracle, E2E, publication durability et garde-fous                                                                            | tous les jobs requis terminés et verts            |
| PLAT-9 documenté avec résultats et limites                       | ce dossier, registre, matrice et feuille de route                                 | freshness documentaire et revue du diff                                                                                                                  | aucune portée sur-déclarée                        |

## 5. Comparaison au référentiel SEOS

La baseline historique autoritative est
[`users-management-c5-baseline.spec.ts`](../../apps/backoffice-angular/src/app/regressions/users-management-c5-baseline.spec.ts).
Elle traverse les vraies couches SEOS et remplace uniquement le réseau. La CI
exécute explicitement `bun run check:c6-seos-baseline`, y compris pour un diff
limité à `tools/` ou `docs/`.

| Observation SEOS figée                                  | Oracle Angular générique                                           | Oracle React générique                                             | Écart assumé                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| GET paginé + filtres wire + mapping items/page          | `list-query-v2-page.spec.ts` puis composition `charge users-list…` | `list-query-v2-page.spec.ts` puis composition `charge les deux…`   | React teste le port host plutôt que `HttpTestingController`         |
| POST snake_case exact                                   | `crée l’utilisateur puis rafraîchit…`                              | `crée puis recharge uniquement users-list…`                        | aucun sur le payload                                                |
| succès puis invalidation de la seule liste utilisateurs | même test ; `BYPASS_CACHE` et absence de GET profils               | même test ; deuxième appel users en refresh, un seul appel profils | la notification visuelle reste une responsabilité UI hors primitive |
| erreur métier : données conservées, aucun nouveau GET   | `conserve les deux queries et n’invalide rien…`                    | `ne recharge rien après une erreur métier…`                        | aucun sur l’état des primitives                                     |

Cette comparaison prouve les comportements de données et de commande exigés par
#64. Elle ne prétend pas promouvoir les toasts, la fermeture du formulaire ou la
fidélité visuelle : ces comportements appartiennent à la réalisation UI et à ses
oracles distincts.

## 6. Équivalence observable C5 à relire humainement

La relecture suit le
[`protocole de recette humaine C6`](./c6-protocole-recette-humaine-2026-10-09.md).
Elle combine l'examen des applications Angular et React dans Playwright, les
oracles instrumentés et la lecture du core : un simple accord fondé sur ce
dossier ou sur la CI ne suffit pas.

L'approbation humaine de cette PR doit confirmer seulement les faits suivants :

1. les quatre lignes de comparaison SEOS ci-dessus sont exactes et leurs écarts
   restent hors de la promotion des primitives ;
2. la liste des utilisateurs et la liste des profils partent indépendamment ;
3. la création envoie les cinq champs wire attendus ;
4. le succès recharge uniquement la liste des utilisateurs ;
5. l'erreur métier conserve les deux listes et n'invalide rien ;
6. une permission absente bloque avant le transport ;
7. les états, annulations et doubles soumissions observés correspondent aux
   contrats C5 ;
8. aucun nom SEOS ni branche spécifique au module n'apparaît dans le core.

La revue visuelle, VoiceOver/NVDA et la fidélité pixel ne sont pas des critères
de promotion des primitives. Elles restent des preuves UI distinctes. Le mock
HTTP ne prouve pas le backend vivant.

## 7. Limites après promotion

- C5 reste un seul cas produit réel de page composite : aucune entrée
  `page-composition proven` n'est créée.
- Les backends SEOS de test n'ont pas été appelés ; les contrats restent des
  observations côté client.
- L'objet unique, les maps, les workflows ordonnés et les invalidations
  inter-pages restent hors preuve.
- `create-module` reste sur v1 et exige toujours le consentement
  `--allow-experimental`.
- SEOS reste actif jusqu'à la clôture effective de #64 ; son archivage sera un
  changement séparé avec inventaire des consommateurs.

## 8. Protocole de clôture

1. exécuter les tests du registre, du générateur, des deux stacks, la commande
   `check:c6-seos-baseline` et les autres gates du dépôt ;
2. faire relire ce dossier et le diff exact par un agent distinct en lecture
   seule ;
3. faire exécuter à Soumaila le protocole de recette humaine, lui demander de
   confirmer explicitement les huit points d'équivalence, puis d'approuver ;
4. fusionner seulement avec toute la CI verte ;
5. vérifier la CI post-fusion de `main` ;
6. reporter dans #64 le SHA, la PR, le run `main` et les limites, puis fermer
   l'issue ;
7. ouvrir ensuite, séparément, l'inventaire d'archivage SEOS.

Une CI verte sans la confirmation humaine ne ferme pas #64. Une approbation sans
CI post-fusion ne clôt pas non plus la chaîne.

## 9. État vivant après la PR #233

- head relu et approuvé : `52659fa5254d96878f5df4da061d52f99302de0a` ;
- commit fusionné sur `main` : `d961708c8ff3684a088a36ef3763064f8720bf4d` ;
- CI de PR : run `37913594103`, 17/17 jobs réussis ;
- CI post-fusion de `main` : run `37916219456`, réussie ;
- preuves et limites reportées dans #64 le 2026-10-09 ;
- Soumaila assigné et notifié pour confirmer explicitement les huit points.

Son approbation GitHub de #233 a autorisé la fusion mais ne contient aucun
corps. Elle ne remplace donc pas l'attestation demandée au §8. L'issue reste
ouverte jusqu'à cette réponse. Cette limite n'annule aucune preuve technique et
ne doit pas être compensée par une nouvelle implémentation.
